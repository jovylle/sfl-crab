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

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function hubBase () {
  const base = process.env.HUB_API_BASE || 'https://beta.api.d1g.uk'
  return base.replace(/\/$/, '')
}

async function proxyToHub (event) {
  const secret = process.env.HUB_WRITE_SECRET
  const base = hubBase()
  const qs = event.queryStringParameters
    ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
    : ''

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (secret && event.httpMethod === 'POST') {
    headers['X-Hub-Write-Secret'] = secret
  }
  const auth = event.headers.authorization || event.headers.Authorization
  if (auth) headers.Authorization = auth

  const url =
    event.httpMethod === 'GET'
      ? `${base}/v1/dig-day${qs}`
      : `${base}/v1/dig-day`

  const res = await fetch(url, {
    method: event.httpMethod,
    headers,
    body: event.httpMethod === 'POST' ? event.body : undefined,
  })

  const text = await res.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {
    /* plain text error */
  }

  return { status: res.status, body }
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

  try {
    checkRateLimit(getClientIp(event))
  } catch (err) {
    return {
      statusCode: err.statusCode || 429,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }

  if (!process.env.HUB_API_BASE) {
    console.warn('dig-day: HUB_API_BASE not set, using https://beta.api.d1g.uk')
  }

  try {
    const { status, body } = await proxyToHub(event)
    const cache =
      event.httpMethod === 'GET'
        ? 'public, max-age=30, must-revalidate'
        : 'no-store'
    return {
      statusCode: status,
      headers: { ...headers, 'Cache-Control': cache },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  } catch (error) {
    console.error('dig-day proxy:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Hub proxy failed',
      }),
    }
  }
}
