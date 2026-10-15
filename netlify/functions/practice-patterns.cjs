const {
  getTodayUTC,
  parseUTCDate,
  initBlobContext,
  getExistingDailySnapshot,
  createAndStoreDailySnapshot,
  revalidateProvisionalSnapshot,
  clampToToday,
  isProvisionalTime,
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

function buildSuccessHeaders (snapshotDate, provisional = false) {
  // Provisional snapshots (seeded inside the post-midnight rollover window) get
  // a short edge TTL so a healed revalidation reaches users within minutes
  // instead of staying hidden behind the day-long cache.
  const ttlSeconds = provisional
    ? 300
    : secondsUntilUTCMidnightForDate(snapshotDate)
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, must-revalidate',
    'CDN-Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60, stale-if-error=600`,
    'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
    'X-Pattern-Date': snapshotDate,
    'X-Pattern-Source': 'daily-snapshot-store',
  }
  if (provisional) {
    headers['X-Pattern-Provisional'] = '1'
  }
  return headers
}

exports.handler = async (event) => {
  initBlobContext(event)
  const requestedUtcDate = parseUTCDate(event?.queryStringParameters?.utcDate)
  // A fast client clock can request "tomorrow" just before UTC midnight and
  // seed a future-dated snapshot from pre-rollover data (observed twice).
  // Nothing legitimately needs future dates — clamp to today.
  const effectiveUtcDate = clampToToday(requestedUtcDate)

  try {
    let snapshot = await getExistingDailySnapshot(effectiveUtcDate)

    // Fallback safety: if warm/scheduler misses, first request seeds the snapshot.
    if (!snapshot) {
      const created = await createAndStoreDailySnapshot(effectiveUtcDate, { force: false })
      snapshot = created.snapshot
    }

    // Heal snapshots seeded inside the rollover window once safely past it —
    // but only for today: a past date has no live source, and healing it would
    // rewrite history with current data. revalidateProvisionalSnapshot never
    // throws; on failure we serve what is stored.
    if (snapshot?.provisional && !isProvisionalTime() && effectiveUtcDate === getTodayUTC()) {
      const revalidated = await revalidateProvisionalSnapshot(effectiveUtcDate, snapshot)
      snapshot = revalidated.snapshot
    }

    return {
      statusCode: 200,
      headers: buildSuccessHeaders(effectiveUtcDate, snapshot?.provisional === true),
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
