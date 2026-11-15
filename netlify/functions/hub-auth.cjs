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
  'http://localhost:8888',
  'http://127.0.0.1:8888',
]


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


/**
 * Map /api/hub-auth/... → /v1/auth/...
 */
function hubAuthSubpath (event) {
  const params = event.pathParameters || {}
  const splat = params.splat || params.proxy
  if (splat) {
    const segment = String(splat).replace(/^\/+/, '')
    return segment ? `/${segment}` : '/me'
  }

  const raw = event.rawPath || event.path || ''
  const fromApi = raw.match(/\/api\/hub-auth(\/.*)?$/)
  const fromFn = raw.match(/\/\.netlify\/functions\/hub-auth(\/.*)?$/)
  const sub = (fromApi && fromApi[1]) || (fromFn && fromFn[1]) || ''
  return sub || '/me'
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
    checkRateLimit(event, 60)
  } catch (err) {
    return {
      statusCode: err.statusCode || 429,
      headers: { ...headers, 'Retry-After': String(err.retryAfter || 60) },
      body: JSON.stringify({ error: err.message }),
    }
  }

  const sub = hubAuthSubpath(event)
  const base = hubBase()
  const url = `${base}/v1/auth${sub}`

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
    const res = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body:
        event.httpMethod === 'POST' || event.httpMethod === 'PUT'
          ? event.body
          : undefined,
      redirect: 'manual',
    })

    const location = res.headers.get('location')
    if (location && res.status >= 300 && res.status < 400) {
      return {
        statusCode: res.status,
        headers: { ...headers, Location: location },
        body: '',
      }
    }

    const text = await res.text()
    let body = text
    try {
      body = JSON.parse(text)
    } catch {
      /* plain */
    }

    return {
      statusCode: res.status,
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  } catch (error) {
    console.error('hub-auth proxy:', error)
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: error.message || 'Hub auth proxy failed',
      }),
    }
  }
}
