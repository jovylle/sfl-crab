const { hubBase } = require('./_hubBase.cjs')

const CORS_ORIGINS = [
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:8888',
  'http://127.0.0.1:8888',
]

const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map()

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
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

  const id = event.queryStringParameters?.id
  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing id parameter' }),
    }
  }

  const base = hubBase()

  try {
    const res = await fetch(`${base}/v1/practice/runs/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const text = await res.text()
    let body = text
    try {
      body = JSON.parse(text)
    } catch {
      /* plain */
    }
    return {
      statusCode: res.status,
      headers: { ...headers, 'Cache-Control': 'public, max-age=60, must-revalidate' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  } catch (error) {
    console.error('practice-run proxy:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Hub proxy failed' }),
    }
  }
}
