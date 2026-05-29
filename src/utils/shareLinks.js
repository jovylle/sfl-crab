import { countCustomMarks, encodeGridState } from '@/utils/gridStateCodec.js'
import { isTestApiEnvironment } from '@/config/api.js'
import { landDiggingPath } from '@/utils/landRoutes.js'

function shareOrigin (baseUrl) {
  if (baseUrl) return String(baseUrl).replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://d1g.uk'
}

function buildShareUrl (base, path, searchParams = {}) {
  const url = new URL(path, `${base}/`)
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === null || value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Opens dig replay modal on d1g.uk (uses saved dig-day + local marks).
 * @param {string} landId
 * @param {string} [baseUrl]
 */
export function buildReplayShareUrl (landId, baseUrl, { test = isTestApiEnvironment() } = {}) {
  const id = String(landId || '').trim()
  if (!id || id === 'guest' || id === '0') return null
  const base = shareOrigin(baseUrl)
  const path = landDiggingPath(id, { test })
  return buildShareUrl(base, path, { replay: '1' })
}

/**
 * Encode only custom marks (cell indices on today's desert — same layout for every land).
 * @param {object} gridManager
 * @returns {string|null}
 */
export function encodeMarksPayload (gridManager) {
  return encodeGridState(gridManager, 'shared')
}

/**
 * Dig link with custom marks: open on the recipient's land so digs load + marks overlay.
 * Flow: visit /{friendLandId}/digging → place marks → share this URL.
 *
 * @param {string} recipientLandId — recipient's land ID (path segment)
 * @param {object} gridManager — marks placed while viewing that land
 * @param {string} [baseUrl]
 */
export function buildGuideMarksUrl (
  recipientLandId,
  gridManager,
  baseUrl,
  { test = isTestApiEnvironment() } = {},
) {
  const to = String(recipientLandId || '').trim()
  if (!to || !/^\d+$/.test(to)) return null
  if (!countCustomMarks(gridManager)) return null
  const encoded = encodeMarksPayload(gridManager)
  if (!encoded) return null
  const base = shareOrigin(baseUrl)
  const path = landDiggingPath(to, { test })
  return buildShareUrl(base, path, { marks: encoded })
}

/** @deprecated Use buildGuideMarksUrl */
export function buildMarksShareUrl (landId, gridManager, baseUrl) {
  return buildGuideMarksUrl(landId, gridManager, baseUrl)
}

/** @deprecated Use buildGuideMarksUrl — payload does not depend on path land IDs */
export function buildMarksShareUrlForLand (_fromLandId, toLandId, gridManager, baseUrl) {
  return buildGuideMarksUrl(toLandId, gridManager, baseUrl)
}
