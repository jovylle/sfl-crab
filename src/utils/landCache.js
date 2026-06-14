import { getLandDataStorageKey } from '@/config/api.js'

export const LAND_CACHE_FRESH_MS = 5 * 60 * 1000

/**
 * @param {string} landId
 * @param {number} [maxAgeMs]
 */
export function readLandCacheMeta (landId, maxAgeMs = LAND_CACHE_FRESH_MS) {
  const today = new Date().toISOString().slice(0, 10)
  let raw = {}
  try {
    raw = JSON.parse(localStorage.getItem(getLandDataStorageKey(landId)) || '{}')
  } catch {
    raw = {}
  }

  const hasValidCache = raw?.date === today && !!raw?.visitedFarmState
  const cacheAge = raw?.fetchedAt ? Date.now() - raw.fetchedAt : Infinity
  const isRecentlyFetched = cacheAge < maxAgeMs

  return {
    raw,
    hasValidCache,
    isRecentlyFetched,
    shouldAutoFetch: !hasValidCache || !isRecentlyFetched,
  }
}
