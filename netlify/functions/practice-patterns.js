const PRACTICE_OWNER_ID = '1'
const API_ORIGIN = 'https://api.sunflower-land.com'

// no diagnostics in production function

function secondsUntilUTCMidnight () {
  const now = new Date()
  const nextMidnightUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))
  const deltaMs = nextMidnightUtc - now
  return Math.max(0, Math.floor(deltaMs / 1000))
}

function buildSuccessHeaders (ttlSeconds) {
  return {
    'Content-Type': 'application/json',
    // Keep browser copies short; shared caches honor CDN-* headers below.
    'Cache-Control': 'public, max-age=60, must-revalidate',
    // Generic CDN directive (useful with Cloudflare in front of Netlify).
    'CDN-Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=300, stale-if-error=86400`,
    // Netlify-specific directive to improve edge hit rates across requests.
    'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${ttlSeconds}, stale-while-revalidate=300`,
  }
}

exports.handler = async () => {
  if (!process.env.SFL_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
    }
  }

  const apiUrl = `${API_ORIGIN}/community/farms/${PRACTICE_OWNER_ID}`

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SFL_API_KEY,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(data),
      }
    }

    const headers = buildSuccessHeaders(secondsUntilUTCMidnight())

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    }
  } catch (error) {
    console.error('practice-patterns:', error)
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to fetch practice patterns' }),
    }
  }
}
