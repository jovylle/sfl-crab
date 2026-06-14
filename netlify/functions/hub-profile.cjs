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
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

/**
 * Map /api/hub-profile/... → /v1/profile/...
 */
function hubProfileSubpath (event) {
  const params = event.pathParameters || {}
  const splat = params.splat || params.proxy
  if (splat) {
    const segment = String(splat).replace(/^\/+/, '')
    return segment ? `/${segment}` : ''
  }

  const raw = event.rawPath || event.path || ''
  const fromApi = raw.match(/\/api\/hub-profile(\/.*)?$/)
  const fromFn = raw.match(/\/\.netlify\/functions\/hub-profile(\/.*)?$/)
  return (fromApi && fromApi[1]) || (fromFn && fromFn[1]) || ''
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
    'Cache-Control': 'no-store',
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

  const sub = hubProfileSubpath(event)
  const base = hubBase()
  const url = `${base}/v1/profile${sub}`

  const forwardHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const auth = event.headers.authorization || event.headers.Authorization
  if (auth) forwardHeaders.Authorization = auth

  const qs = event.queryStringParameters
    ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
    : ''
  const targetUrl = `${url}${qs}`

  try {
    const withBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.httpMethod)
    const res = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body: withBody ? event.body : undefined,
      redirect: 'manual',
    })

    const text = await res.text()
    let body = text
    try {
      body = JSON.parse(text)
    } catch {
      /* plain text */
    }

    return {
      statusCode: res.status,
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  } catch (error) {
    console.error('hub-profile proxy:', error)
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: error.message || 'Hub profile proxy failed' }),
    }
  }
}
