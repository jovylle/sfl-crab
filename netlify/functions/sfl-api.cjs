// Netlify serverless function to proxy Sunflower Land API calls
// This keeps the API key secure on the server side

const { checkRateLimit } = require('./_rateLimit.cjs')

const API_ORIGINS = {
  production: 'https://api.sunflower-land.com',
  test: 'https://api-dev.sunflower-land.com',
}

const CACHE_TTL_MS = 60_000
const RATE_LIMIT_PER_MINUTE = 60
// Bounds on state and upstream traffic per warm lambda instance. The per-IP
// limit alone is not enough: on the Netlify-direct hostname the client can
// forge the IP header, so a global ceiling caps upstream calls regardless.
const MAX_CACHE_ENTRIES = 500
const UPSTREAM_BUDGET_PER_MINUTE = 120
const UPSTREAM_WINDOW_MS = 60_000

// The app only ever fetches one upstream path. Anything else is refused so the
// proxy cannot be used to call arbitrary endpoints with the owner's API key.
// Ids have no leading zero so one farm maps to exactly one canonical path.
const ALLOWED_PATH = /^\/community\/farms\/[1-9]\d{0,19}\/?$/

const CORS_ORIGINS = [
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'https://sfl.uft1.com',
  'https://sfl-digging.uft1.com',
  'https://sfl-development.uft1.com',
  'https://d1guk.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:8888',
  'http://127.0.0.1:8888',
]
const NETLIFY_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+--d1guk\.netlify\.app$/

function isAllowedOrigin (origin) {
  return CORS_ORIGINS.includes(origin) || NETLIFY_PREVIEW_ORIGIN.test(origin)
}

function isAllowedApiPath (apiPath) {
  return typeof apiPath === 'string' && ALLOWED_PATH.test(apiPath)
}

function requestOrigin (event) {
  const headers = event.headers || {}
  return (
    Object.entries(headers).find(([k]) => k.toLowerCase() === 'origin')?.[1] ||
    ''
  )
}

// Returns the value for Access-Control-Allow-Origin, or null when the request
// carries an Origin that is not on the allow-list. Requests without an Origin
// (same-origin GET, curl, health checks) get the production origin.
function resolveCorsOrigin (origin) {
  if (!origin) return CORS_ORIGINS[0]
  return isAllowedOrigin(origin) ? origin : null
}
const responseCache = new Map()

function resolveApiTarget (event) {
  const headers = event.headers || {}
  const header =
    headers['x-sfl-api-env'] ||
    headers['X-Sfl-Api-Env'] ||
    Object.entries(headers).find(
      ([k]) => k.toLowerCase() === 'x-sfl-api-env',
    )?.[1] ||
    ''
  const query = event.queryStringParameters?.env || ''
  const useTest = header === 'test' || query === 'test'
  const env = useTest ? 'test' : 'production'
  const apiKey = useTest ? process.env.SFL_API_KEY_DEV : process.env.SFL_API_KEY
  return { env, apiKey, origin: API_ORIGINS[env] }
}

const baseHeaders = {
  'Content-Type': 'application/json',
  // Explicit no-store: land data is dynamic per-farm, and leaving this unset
  // lets netlify dev's fastify static layer apply its default 1h browser cache
  // (public, max-age=3600) locally — which makes the refresh button look broken
  // (browser serves the old body). In prod it guarantees no browser/CDN caching;
  // the only cache is this function's 60s in-memory responseCache, which the
  // x-sfl-bypass-cache header controls. If edge caching is ever wanted, switch
  // to CDN-Cache-Control + Vary (see practice-patterns.cjs).
  'Cache-Control': 'no-store',
  Vary: 'Origin',
  'Access-Control-Allow-Headers': 'Content-Type, x-sfl-api-env, x-sfl-bypass-cache',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function shouldBypassCache (event) {
  const headers = event.headers || {}
  const header =
    headers['x-sfl-bypass-cache'] ||
    headers['X-Sfl-Bypass-Cache'] ||
    Object.entries(headers).find(
      ([k]) => k.toLowerCase() === 'x-sfl-bypass-cache',
    )?.[1] ||
    ''
  const query = event.queryStringParameters?.bypassCache || ''
  return header === '1' || query === '1'
}

function landIdFromPath (apiPath) {
  return apiPath.match(/\/(\d+)\/?$/)?.[1] || null
}

function safeLogPath (value) {
  return String(value ?? '').slice(0, 100)
}

function logSflApi (fields) {
  console.log('sfl-api', fields)
}

function getCachedResponse (cacheKey) {
  const entry = responseCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    responseCache.delete(cacheKey)
    return null
  }
  return entry
}

function setCachedResponse (cacheKey, statusCode, body) {
  responseCache.delete(cacheKey)
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now()
    for (const [key, entry] of responseCache) {
      if (now - entry.storedAt > CACHE_TTL_MS) responseCache.delete(key)
    }
    // Map iterates in insertion order, so the first key is the oldest.
    while (responseCache.size >= MAX_CACHE_ENTRIES) {
      responseCache.delete(responseCache.keys().next().value)
    }
  }
  responseCache.set(cacheKey, {
    storedAt: Date.now(),
    statusCode,
    body,
  })
}

let upstreamWindowStart = 0
let upstreamCount = 0

// Returns the seconds to wait when the per-instance upstream budget is spent,
// or 0 when the call may proceed (and has been counted).
function takeUpstreamBudget () {
  const now = Date.now()
  if (now - upstreamWindowStart > UPSTREAM_WINDOW_MS) {
    upstreamWindowStart = now
    upstreamCount = 0
  }
  if (upstreamCount >= UPSTREAM_BUDGET_PER_MINUTE) {
    return Math.max(1, Math.ceil((upstreamWindowStart + UPSTREAM_WINDOW_MS - now) / 1000))
  }
  upstreamCount += 1
  return 0
}

exports.handler = async (event) => {
  const reqOrigin = requestOrigin(event)
  const allowedOrigin = resolveCorsOrigin(reqOrigin)

  if (allowedOrigin === null) {
    logSflApi({ status: 403, reason: 'origin_not_allowed' })
    return {
      statusCode: 403,
      headers: { ...baseHeaders, 'Access-Control-Allow-Origin': CORS_ORIGINS[0] },
      body: JSON.stringify({ error: 'Origin not allowed' }),
    }
  }

  const corsHeaders = { ...baseHeaders, 'Access-Control-Allow-Origin': allowedOrigin }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const { env, apiKey, origin } = resolveApiTarget(event)
  const { path } = event
  let apiPath = String(path || '').replace(/^\/\.netlify\/functions\/sfl-api/, '')
  const legacyVisit = apiPath.startsWith('/visit/')
  if (legacyVisit) {
    apiPath = apiPath.replace(/^\/visit\//, '/community/farms/')
  }

  if (!isAllowedApiPath(apiPath)) {
    logSflApi({ env, path: safeLogPath(apiPath), status: 404, reason: 'path_not_allowed' })
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    }
  }

  // Canonical form (no trailing slash) so variants share one cache entry.
  apiPath = apiPath.replace(/\/$/, '')

  try {
    checkRateLimit(event, RATE_LIMIT_PER_MINUTE)
  } catch (err) {
    logSflApi({ env, path: apiPath, status: err.statusCode || 429, reason: 'rate_limited' })
    return {
      statusCode: err.statusCode || 429,
      headers: { ...corsHeaders, 'Retry-After': String(err.retryAfter || 60) },
      body: JSON.stringify({ error: err.message }),
    }
  }

  const landId = landIdFromPath(apiPath)
  const cacheKey = `${env}:${apiPath}`

  if (!apiKey) {
    const keyName = env === 'test' ? 'SFL_API_KEY_DEV' : 'SFL_API_KEY'
    logSflApi({ env, path: apiPath, landId, status: 500, reason: 'missing_api_key' })
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: `${keyName} not configured` }),
    }
  }

  const bypassCache = shouldBypassCache(event)

  const cached = !bypassCache && getCachedResponse(cacheKey)
  if (cached) {
    logSflApi({ env, path: apiPath, landId, status: cached.statusCode, cache: 'hit' })
    return {
      statusCode: cached.statusCode,
      headers: corsHeaders,
      body: cached.body,
    }
  }

  const waitSeconds = takeUpstreamBudget()
  if (waitSeconds > 0) {
    logSflApi({ env, path: apiPath, landId, status: 429, reason: 'upstream_budget' })
    return {
      statusCode: 429,
      headers: { ...corsHeaders, 'Retry-After': String(waitSeconds) },
      body: JSON.stringify({ error: 'Too many requests — please retry in a moment' }),
    }
  }

  const apiUrl = `${origin}${apiPath}`

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    })

    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        logSflApi({ env, path: apiPath, landId, status: 502, reason: 'invalid_json' })
        console.error('API JSON parse error:', parseError.message, 'status:', response.status)
        return {
          statusCode: 502,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON from Sunflower Land API' }),
        }
      }
    }

    const body = JSON.stringify(data)
    if (response.status === 200) {
      setCachedResponse(cacheKey, response.status, body)
    }

    logSflApi({
      env,
      path: apiPath,
      landId,
      status: response.status,
      cache: bypassCache ? 'bypass' : 'miss',
      ...(legacyVisit ? { legacyVisit: true } : {}),
    })

    return {
      statusCode: response.status,
      headers: corsHeaders,
      body,
    }
  } catch (error) {
    logSflApi({ env, path: apiPath, landId, status: 500, reason: 'fetch_error' })
    console.error('API Error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to fetch data from Sunflower Land API' }),
    }
  }
}

exports.isAllowedApiPath = isAllowedApiPath
exports.resolveCorsOrigin = resolveCorsOrigin

// Test hooks.
exports.MAX_CACHE_ENTRIES = MAX_CACHE_ENTRIES
exports.UPSTREAM_BUDGET_PER_MINUTE = UPSTREAM_BUDGET_PER_MINUTE
exports.setCachedResponse = setCachedResponse
exports.cacheSize = () => responseCache.size
exports.resetState = () => {
  responseCache.clear()
  upstreamWindowStart = 0
  upstreamCount = 0
}
