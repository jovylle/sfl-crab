const { hubBase } = require('./_hubBase.cjs')
const { checkRateLimit } = require('./_rateLimit.cjs')

const CORS_ORIGINS = [
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]


function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, If-None-Match',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'ETag',
  }
}


function digDayLandId (event) {
  if (event.httpMethod === 'GET') {
    return event.queryStringParameters?.landId || 'unknown'
  }
  try {
    const body = JSON.parse(event.body || '{}')
    return body.landId || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * The Hub answers 404 with a full, empty dig-day body when a land has no
 * snapshot for the date. That is the normal first-visit-of-the-day state.
 */
function isEmptySnapshotBody (body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  if (body.v !== 1) return false
  if (!Array.isArray(body.patterns) || body.patterns.length !== 0) return false
  if (!Array.isArray(body.digs) || body.digs.length !== 0) return false
  if (Array.isArray(body.markEvents) && body.markEvents.length !== 0) return false
  return body.stats?.totalDigs === 0
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
  const ifNoneMatch =
    event.headers['if-none-match'] || event.headers['If-None-Match']
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch

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

  return {
    status: res.status,
    body,
    etag: res.headers.get('etag'),
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

  try {
    checkRateLimit(event, 120)
  } catch (err) {
    console.log('dig-day', {
      method: event.httpMethod,
      landId: digDayLandId(event),
      status: err.statusCode || 429,
      reason: 'rate_limit',
    })
    return {
      statusCode: err.statusCode || 429,
      headers: { ...headers, 'Retry-After': String(err.retryAfter || 60) },
      body: JSON.stringify({ error: err.message }),
    }
  }

  if (!process.env.HUB_API_BASE) {
    console.warn('dig-day: HUB_API_BASE not set, using https://beta.api.d1g.uk')
  }

  try {
    const hub = await proxyToHub(event)
    const { body, etag } = hub
    let status = hub.status
    // Report "no snapshot yet" as 200 so it is not counted as a 404 error.
    if (
      event.httpMethod === 'GET' &&
      status === 404 &&
      isEmptySnapshotBody(body)
    ) {
      status = 200
    }
    const cache =
      event.httpMethod === 'GET'
        ? 'public, max-age=120, must-revalidate'
        : 'no-store'
    const responseHeaders = { ...headers, 'Cache-Control': cache }
    if (etag) responseHeaders.ETag = etag

    console.log('dig-day', {
      method: event.httpMethod,
      landId: digDayLandId(event),
      status,
    })

    return {
      statusCode: status,
      headers: responseHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  } catch (error) {
    console.log('dig-day', {
      method: event.httpMethod,
      landId: digDayLandId(event),
      status: 500,
      reason: 'proxy_error',
    })
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
