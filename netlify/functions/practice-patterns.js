const PRACTICE_OWNER_ID = '1'
const API_ORIGIN = 'https://api.sunflower-land.com'

// Per-instance invocation counter. Note: serverless may run multiple instances;
// this counter is process-local and will reset when a new instance is created.
let invocationCount = 0

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

exports.handler = async (event) => {
  invocationCount += 1

  const instanceId = process.pid || 'pid-n/a'
  const when = new Date().toISOString()

  // Log invocation with referer/origin info to help trace callers
  const referer = (event && event.headers && (event.headers.referer || event.headers.referrer || event.headers.origin)) || 'none'
  console.log(`[practice-patterns] invocation #${invocationCount} instance=${instanceId} time=${when} referer=${referer}`)

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
      // Expose diagnostic info for debugging in DevTools
      'X-Practice-Fetch-Count': String(invocationCount),
      'X-Practice-Instance': String(instanceId),
      'X-Practice-Fetch-Timestamp': when,
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
        'X-Practice-Fetch-Count': String(invocationCount),
        'X-Practice-Instance': String(instanceId),
        'X-Practice-Fetch-Timestamp': when,
      },
      body: JSON.stringify({ error: 'Failed to fetch practice patterns' }),
    }
  }
}
