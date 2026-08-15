// src/services/landFetchCoordinator.js
//
// The ONLY door to the Sunflower Land farm API.
//
// Every component/composable that needs live land data goes through
// requestLandData() — never call fetchLandDataFromServer() directly.
//
// Policy (full table in docs/API_LAYER.md):
//   - Auto loads   -> serve the localStorage cache while it is fresh
//                     (< LAND_CACHE_FRESH_MS); otherwise fetch through the
//                     proxy's own 60s cache (no bypass header).
//   - User refresh -> bypassCache: true (skip freshness AND the proxy cache),
//                     still respects the 15s cooldown.
//   - Env switch   -> force: true (skip freshness AND cooldown).
//   - Single-flight: concurrent requests for the same (env, landId) share one
//     network call — same pattern as usePracticePatterns' ongoingFetch.
//   - Every network hit (success or failure) arms the localStorage cooldown.

import { fetchLandData } from '@/services/landSyncService'
import {
  getLandCooldownStorageKey,
  getLandDataStorageKey,
  isTestApiEnvironment,
} from '@/config/api.js'
import { LAND_CACHE_FRESH_MS } from '@/utils/landCache.js'

const SUCCESS_COOLDOWN_MS = 15_000
const FAILURE_COOLDOWN_MS = 30_000

// Module-scoped single-flight map: `${env}:${landId}` -> in-flight Promise.
const inflight = new Map()

const hasWindow = () => typeof window !== 'undefined'
const todayUTC = () => new Date().toISOString().slice(0, 10)

function requestKey (landId) {
  return `${isTestApiEnvironment() ? 'test' : 'production'}:${String(landId)}`
}

function readCacheEnvelope (landId) {
  if (!hasWindow()) return null
  try {
    return JSON.parse(localStorage.getItem(getLandDataStorageKey(landId)) || 'null')
  } catch {
    return null
  }
}

/** The stored envelope `{ date, fetchedAt, visitedFarmState, ... }` or null. */
export function readLandCache (landId) {
  return readCacheEnvelope(landId) || null
}

/** Envelope only when it is for today AND younger than maxAgeMs. */
export function readFreshLandCache (landId, maxAgeMs = LAND_CACHE_FRESH_MS) {
  const raw = readCacheEnvelope(landId)
  if (!raw || raw.date !== todayUTC() || !raw.visitedFarmState) return null
  if (!raw.fetchedAt || Date.now() - raw.fetchedAt > maxAgeMs) return null
  return raw
}

export function isCooldownActive (landId) {
  if (!hasWindow()) return false
  const end = Number(localStorage.getItem(getLandCooldownStorageKey(landId)) || 0)
  return end > Date.now()
}

function armCooldown (landId, ms) {
  if (!hasWindow()) return
  localStorage.setItem(getLandCooldownStorageKey(landId), String(Date.now() + ms))
}

function writeCache (landId, data) {
  if (!hasWindow()) return
  localStorage.setItem(
    getLandDataStorageKey(landId),
    JSON.stringify({ date: todayUTC(), fetchedAt: Date.now(), ...data }),
  )
}

/**
 * Fetch land data with dedup + freshness + cooldown policy.
 *
 * @param {string} landId
 * @param {{ force?: boolean, bypassCache?: boolean }} [options]
 * @returns {Promise<object|null>} Envelope `{ date, fetchedAt, visitedFarmState }`,
 *   or null when the call was suppressed (cooldown active, nothing cached).
 */
export async function requestLandData (landId, { force = false, bypassCache = false } = {}) {
  if (!landId) throw new Error('landId is required')
  const key = requestKey(landId)

  // 1. Fresh cache short-circuit — auto loads only. A user refresh
  //    (bypassCache) explicitly wants to re-hit the server.
  if (!force && !bypassCache) {
    const fresh = readFreshLandCache(landId)
    if (fresh) return fresh
  }

  // 2. Cooldown: suppress the network call, still serve whatever we have.
  //    Navigation/mounts never pile requests onto a busy server.
  if (!force && isCooldownActive(landId)) {
    return readLandCache(landId)
  }

  // 3. Single-flight: concurrent callers share one network request.
  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    const data = await fetchLandData(landId, { bypassCache })
    writeCache(landId, data)
    armCooldown(landId, SUCCESS_COOLDOWN_MS)
    return { date: todayUTC(), fetchedAt: Date.now(), ...data }
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } catch (err) {
    armCooldown(landId, FAILURE_COOLDOWN_MS)
    throw err
  } finally {
    inflight.delete(key)
  }
}
