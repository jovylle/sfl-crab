import { encodeGridState } from '@/utils/gridStateCodec.js'

function shareOrigin (baseUrl) {
  if (baseUrl) return String(baseUrl).replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://d1g.uk'
}

/**
 * Opens dig replay modal on d1g.uk (uses saved dig-day + local marks).
 * @param {string} landId
 * @param {string} [baseUrl]
 */
export function buildReplayShareUrl (landId, baseUrl) {
  const id = String(landId || '').trim()
  if (!id || id === 'guest' || id === '0') return null
  const base = shareOrigin(baseUrl)
  return `${base}/${id}/digging?replay=1`
}

/**
 * Live grid with expert's custom marks (for in-game digging on the same daily desert).
 * @param {string} landId
 * @param {object} gridManager
 * @param {string} [baseUrl]
 */
/**
 * Marks are cell indices on today's desert (same for all players).
 * Recipient should use their land in the path: /theirLandId/digging?marks=…
 */
export function buildMarksShareUrl (landId, gridManager, baseUrl) {
  const id = String(landId || '').trim()
  if (!id || id === 'guest' || id === '0') return null
  const encoded = encodeGridState(gridManager, id)
  const base = shareOrigin(baseUrl)
  const param = encodeURIComponent(encoded)
  return `${base}/${id}/digging?marks=${param}`
}

/** Same marks payload for a specific recipient land ID. */
export function buildMarksShareUrlForLand (fromLandId, toLandId, gridManager, baseUrl) {
  const marksParam = buildMarksShareUrl(fromLandId, gridManager, baseUrl)?.split('marks=')[1]
  if (!marksParam) return null
  const to = String(toLandId || '').trim()
  if (!to || !/^\d+$/.test(to)) return null
  const base = shareOrigin(baseUrl)
  return `${base}/${to}/digging?marks=${marksParam}`
}
