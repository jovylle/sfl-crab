const PRACTICE_OWNER_ID = '1'
const API_ORIGIN = 'https://api.sunflower-land.com'

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
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=0, s-maxage=${secondsUntilUTCMidnight()}`,
    }

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
