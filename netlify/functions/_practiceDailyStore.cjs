const { connectLambda, getStore } = require('@netlify/blobs')

const PRACTICE_OWNER_ID = '1'
const API_ORIGIN = 'https://api.sunflower-land.com'
const STORE_NAME = 'practice-daily-patterns'

function getTodayUTC () {
  return new Date().toISOString().slice(0, 10)
}

function parseUTCDate (value) {
  if (typeof value !== 'string') return getTodayUTC()
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayUTC()
}

function normalizePracticePayload (data) {
  if (!data) {
    return { visitedFarmState: {} }
  }

  if (data.visitedFarmState) {
    return data
  }

  if (data.farm) {
    return { visitedFarmState: data.farm }
  }

  return { visitedFarmState: data }
}

function getSnapshotKey (utcDate) {
  return `${utcDate}.json`
}

// Snapshots seeded within ROLLOVER_GUARD_MS after UTC midnight may have been
// built from pre-rollover SFL data (API-side lag, or a visitor whose clock runs
// fast requesting "tomorrow" just before midnight — observed 2026-10-04,
// seeded 23:59:55Z for the 4th with the 3rd's patterns, then locked in all day).
// They are marked provisional and revalidated against live SFL on later reads.
const ROLLOVER_GUARD_MS = 15 * 60 * 1000
// Past this point SFL has surely rolled over: a provisional snapshot whose
// patterns still match live is a genuine repeat, safe to confirm.
const ROLLOVER_CONFIRM_MS = 2 * 60 * 60 * 1000

function startOfUtcDayMs (nowMs = Date.now()) {
  const n = new Date(nowMs)
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}

function isProvisionalTime (nowMs = Date.now()) {
  return nowMs - startOfUtcDayMs(nowMs) < ROLLOVER_GUARD_MS
}

function patternsEqual (a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || [])
}

function initBlobContext (event) {
  try {
    connectLambda(event)
  } catch (error) {
    // Netlify will already provide context in non-compat runtimes.
  }
}

async function getExistingDailySnapshot (utcDate) {
  const store = getStore(STORE_NAME)
  const key = getSnapshotKey(utcDate)
  return store.get(key, { type: 'json' })
}

async function fetchLivePracticePayload () {
  if (!process.env.SFL_API_KEY) {
    throw new Error('API key not configured')
  }

  const apiUrl = `${API_ORIGIN}/community/farms/${PRACTICE_OWNER_ID}`
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SFL_API_KEY,
    },
  })

  const payload = await response.json()
  if (!response.ok) {
    const error = new Error('Failed to fetch practice payload from source API')
    error.statusCode = response.status
    error.payload = payload
    throw error
  }

  return normalizePracticePayload(payload)
}

async function createAndStoreDailySnapshot (utcDate, { force = false } = {}) {
  const store = getStore(STORE_NAME)
  const key = getSnapshotKey(utcDate)

  if (!force) {
    const existing = await store.get(key, { type: 'json' })
    if (existing) {
      return { snapshot: existing, fromCache: true }
    }
  }

  const livePayload = await fetchLivePracticePayload()
  const patterns = livePayload.visitedFarmState?.desert?.digging?.patterns || []
  const snapshot = {
    date: utcDate,
    generatedAt: new Date().toISOString(),
    source: 'daily-snapshot',
    patterns,
    // Only today's snapshot can be pre-rollover; backfills of past dates are final.
    provisional: utcDate === getTodayUTC() && isProvisionalTime(),
    visitedFarmState: livePayload.visitedFarmState || {},
  }

  await store.setJSON(key, snapshot)

  return { snapshot, fromCache: false }
}

/**
 * Revalidate a provisional snapshot against live SFL. Heals the stored snapshot
 * when it was built from pre-rollover data. Never throws — on any failure the
 * caller keeps serving the stored snapshot (stale-if-error).
 *
 * @returns {Promise<{ snapshot: object, healed: boolean }>}
 */
async function revalidateProvisionalSnapshot (utcDate, existing, nowMs = Date.now()) {
  try {
    const livePayload = await fetchLivePracticePayload()
    const livePatterns = livePayload.visitedFarmState?.desert?.digging?.patterns || []

    if (!patternsEqual(livePatterns, existing.patterns || [])) {
      const store = getStore(STORE_NAME)
      const healed = {
        ...existing,
        generatedAt: new Date().toISOString(),
        provisional: false,
        patterns: livePatterns,
        visitedFarmState: livePayload.visitedFarmState || {},
      }
      await store.setJSON(getSnapshotKey(utcDate), healed)
      return { snapshot: healed, healed: true }
    }

    if (nowMs - startOfUtcDayMs(nowMs) > ROLLOVER_CONFIRM_MS) {
      const store = getStore(STORE_NAME)
      const confirmed = { ...existing, provisional: false }
      await store.setJSON(getSnapshotKey(utcDate), confirmed)
      return { snapshot: confirmed, healed: false }
    }

    return { snapshot: existing, healed: false }
  } catch {
    return { snapshot: existing, healed: false }
  }
}

module.exports = {
  getTodayUTC,
  parseUTCDate,
  initBlobContext,
  getExistingDailySnapshot,
  createAndStoreDailySnapshot,
  revalidateProvisionalSnapshot,
  isProvisionalTime,
  patternsEqual,
}
