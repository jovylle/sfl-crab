const { connectLambda } = require('@netlify/blobs')
const {
  getTodayUTC,
  parseUTCDate,
  isValidLandId,
  emptySnapshot,
  getDigDay,
  saveDigDay,
} = require('./_digDayStore')

const CORS_ORIGINS = [
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

// Per-instance rate limit (best-effort on serverless)
const rateBuckets = new Map()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function initBlobContext (event) {
  try {
    connectLambda(event)
  } catch {
    // Non-compat runtimes may already provide context
  }
}

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
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

exports.handler = async (event) => {
  initBlobContext(event)
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

  try {
    if (event.httpMethod === 'GET') {
      const landId = String(event.queryStringParameters?.landId || '')
      const utcDate = parseUTCDate(event.queryStringParameters?.utcDate)

      if (!isValidLandId(landId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid landId' }),
        }
      }

      const snapshot = await getDigDay(landId, utcDate)
      if (!snapshot) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify(emptySnapshot(landId, utcDate)),
        }
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=30, must-revalidate',
        },
        body: JSON.stringify(snapshot),
      }
    }

    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}')
      const merged = await saveDigDay(payload)
      return {
        statusCode: 200,
        headers: { ...headers, 'Cache-Control': 'no-store' },
        body: JSON.stringify(merged),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('dig-day:', error)
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
      }),
    }
  }
}
