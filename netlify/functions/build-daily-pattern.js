const {
  getTodayUTC,
  parseUTCDate,
  createAndStoreDailySnapshot,
} = require('./_practiceDailyStore')

function getHeader (headers, key) {
  if (!headers) return ''
  return headers[key] || headers[key.toLowerCase()] || ''
}

function isAuthorized (event) {
  const expected = process.env.DAILY_SNAPSHOT_SECRET
  if (!expected) return true

  const provided = getHeader(event?.headers, 'x-snapshot-secret')
  return provided === expected
}

exports.handler = async (event) => {
  if (!isAuthorized(event)) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  const requestedUtcDate = parseUTCDate(event?.queryStringParameters?.utcDate || getTodayUTC())
  const force = event?.queryStringParameters?.force === '1'

  try {
    const { snapshot, fromCache } = await createAndStoreDailySnapshot(requestedUtcDate, { force })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        ok: true,
        date: snapshot.date,
        patterns: snapshot.patterns || [],
        generatedAt: snapshot.generatedAt,
        fromCache,
      }),
    }
  } catch (error) {
    const statusCode = error?.statusCode || 502
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(error?.payload || { error: 'Failed to build daily pattern snapshot' }),
    }
  }
}
