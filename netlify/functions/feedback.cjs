const crypto = require('crypto')
const { connectLambda, getStore } = require('@netlify/blobs')

const CORS_ORIGINS = [
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map()

const MAX_MESSAGE_CHARS = 5000
const MAX_EMAIL_CHARS = 200
const MAX_PAGE_URL_CHARS = 500
const MAX_SCREENSHOT_CHARS = 1_500_000

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, If-None-Match',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function getClientIp (event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function checkRateLimit (ip) {
  const now = Date.now()
  let bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 }
    rateBuckets.set(ip, bucket)
  }
  bucket.count += 1
  if (bucket.count > RATE_LIMIT) {
    const err = new Error('Too many requests')
    err.statusCode = 429
    throw err
  }
}

function validateBody (body) {
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    const err = new Error('Message is required (1-5000 chars).')
    err.statusCode = 400
    throw err
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (email.length > MAX_EMAIL_CHARS) {
    const err = new Error('Email is too long.')
    err.statusCode = 400
    throw err
  }

  const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim() : ''
  if (pageUrl.length > MAX_PAGE_URL_CHARS) {
    const err = new Error('pageUrl is too long.')
    err.statusCode = 400
    throw err
  }

  let screenshot = typeof body.screenshot === 'string' ? body.screenshot : ''
  if (screenshot) {
    if (!screenshot.startsWith('data:image/')) {
      const err = new Error('screenshot must be a data:image/ URL.')
      err.statusCode = 400
      throw err
    }
    if (screenshot.length > MAX_SCREENSHOT_CHARS) {
      // Oversized screenshot: drop the field rather than reject the submission.
      screenshot = ''
    }
  }

  const landId = body.landId ?? null
  const tileContext = body.tileContext && typeof body.tileContext === 'object' ? body.tileContext : null

  return { message, email, pageUrl, screenshot, landId, tileContext }
}

exports.handler = async (event) => {
  connectLambda(event)

  const origin = event.headers.origin || event.headers.Origin
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    checkRateLimit(getClientIp(event))
  } catch (err) {
    return {
      statusCode: err.statusCode || 429,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { message, email, pageUrl, screenshot, landId, tileContext } = validateBody(body)

    const record = {
      message,
      email,
      pageUrl,
      landId,
      tileContext,
      screenshot: screenshot || null,
      createdAt: new Date().toISOString(),
      ip: getClientIp(event),
    }

    const key = `${Date.now()}-${crypto.randomUUID()}.json`
    const store = getStore('feedback-reports')
    await store.setJSON(key, record)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ ok: true, id: key }),
    }
  } catch (error) {
    console.error('feedback:', error)
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Could not save feedback' }),
    }
  }
}
