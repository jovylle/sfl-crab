/** Skip Netlify GET invocations when the same land + date was loaded recently. */
export const DIG_DAY_GET_CACHE_MS = 15 * 60 * 1000

function cacheKey (landId, utcDate) {
  return `digDayCache_${landId}_${utcDate}`
}

/**
 * @param {string} landId
 * @param {string} utcDate
 */
export function readDigDayCache (landId, utcDate) {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(landId, utcDate))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || typeof entry !== 'object') return null
    return entry
  } catch {
    return null
  }
}

/**
 * @param {string} landId
 * @param {string} utcDate
 * @param {{ body: object | null, etag?: string | null, fetchedAt?: number }} entry
 */
export function writeDigDayCache (landId, utcDate, entry) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      cacheKey(landId, utcDate),
      JSON.stringify({
        body: entry.body ?? null,
        etag: entry.etag || null,
        fetchedAt: entry.fetchedAt || Date.now(),
      }),
    )
  } catch {
    /* quota or private mode */
  }
}

/**
 * @param {string} landId
 * @param {string} utcDate
 */
export function clearDigDayCache (landId, utcDate) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(cacheKey(landId, utcDate))
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} landId
 * @param {string} utcDate
 * @param {number} [maxAgeMs]
 */
export function getFreshDigDayCache (landId, utcDate, maxAgeMs = DIG_DAY_GET_CACHE_MS) {
  const entry = readDigDayCache(landId, utcDate)
  if (!entry) return null
  const age = entry.fetchedAt ? Date.now() - entry.fetchedAt : Infinity
  if (age > maxAgeMs) return null
  return entry
}
