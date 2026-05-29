const {
  getTodayUTC,
  parseUTCDate,
  initBlobContext,
  getExistingDailySnapshot,
  createAndStoreDailySnapshot,
} = require('./_practiceDailyStore.cjs')

function secondsUntilUTCMidnightForDate (utcDate) {
  const now = new Date()
  const todayUTC = getTodayUTC()
  if (utcDate !== todayUTC) {
    return 86400
  }

  const nextMidnightUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))
  return Math.max(0, Math.floor((nextMidnightUtc.getTime() - now.getTime()) / 1000))
}

function buildSuccessHeaders (snapshotDate) {
  const ttlSeconds = secondsUntilUTCMidnightForDate(snapshotDate)
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, must-revalidate',
    'CDN-Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60, stale-if-error=600`,
    'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
    'X-Pattern-Date': snapshotDate,
    'X-Pattern-Source': 'daily-snapshot-store',
  }
}

exports.handler = async (event) => {
  initBlobContext(event)
  const requestedUtcDate = parseUTCDate(event?.queryStringParameters?.utcDate)
  try {
    let snapshot = await getExistingDailySnapshot(requestedUtcDate)

    // Fallback safety: if warm/scheduler misses, first request seeds the snapshot.
    if (!snapshot) {
      const created = await createAndStoreDailySnapshot(requestedUtcDate, { force: false })
      snapshot = created.snapshot
    }

    return {
      statusCode: 200,
      headers: buildSuccessHeaders(requestedUtcDate),
      body: JSON.stringify({
        date: snapshot.date,
        visitedFarmState: snapshot.visitedFarmState || {},
      }),
    }
  } catch (error) {
    const statusCode = error?.statusCode || 502
    console.error('practice-patterns:', error)
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(error?.payload || { error: 'Failed to fetch practice patterns' }),
    }
  }
}
