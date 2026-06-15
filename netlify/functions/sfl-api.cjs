// Netlify serverless function to proxy Sunflower Land API calls
// This keeps the API key secure on the server side

const API_ORIGINS = {
  production: 'https://api.sunflower-land.com',
  test: 'https://api-dev.sunflower-land.com',
}

const CACHE_TTL_MS = 60_000
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

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-sfl-api-env',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function landIdFromPath (apiPath) {
  return apiPath.match(/\/(\d+)\/?$/)?.[1] || null
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
  responseCache.set(cacheKey, {
    storedAt: Date.now(),
    statusCode,
    body,
  })
}

exports.handler = async (event) => {
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
  const apiPath = path.replace('/.netlify/functions/sfl-api', '')
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

  const cached = getCachedResponse(cacheKey)
  if (cached) {
    logSflApi({ env, path: apiPath, landId, status: cached.statusCode, cache: 'hit' })
    return {
      statusCode: cached.statusCode,
      headers: corsHeaders,
      body: cached.body,
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

    logSflApi({ env, path: apiPath, landId, status: response.status, cache: 'miss' })

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
