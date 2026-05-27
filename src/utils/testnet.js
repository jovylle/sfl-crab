/** Keep in sync with @sfl-digging-hub/shared testnet.ts */

export const TESTNET_QUERY = 'testnet'

/** Mainnet farm IDs are typically ≤12 digits; api-dev farms are often longer. */
export const TESTNET_LAND_MIN_DIGITS = 13

export function isTestnetLandId (landId) {
  const id = String(landId || '').trim()
  return /^\d+$/.test(id) && id.length >= TESTNET_LAND_MIN_DIGITS
}

/**
 * True when the URL requests testnet (api-dev).
 * Bare `?testnet` (no `=`) is valid; Vue Router may omit it from `query`, so pass `search` or `fullPath` too.
 * @param {Record<string, unknown> | undefined | null} query
 * @param {string} [searchOrFullPath] — e.g. route.fullPath or location.search
 */
export function hasTestnetQuery (query, searchOrFullPath = '') {
  if (query && Object.prototype.hasOwnProperty.call(query, TESTNET_QUERY)) {
    const v = query[TESTNET_QUERY]
    if (v === null || v === undefined || v === '' || v === '1' || v === 'true') {
      return true
    }
    return String(v).toLowerCase() === 'true'
  }
  const s = String(searchOrFullPath || '')
  return /[?&]testnet(?=$|[=&])/.test(s)
}

export function testnetLandMessage (landId) {
  const id = landId ? ` (${landId})` : ''
  return `This is a testnet land ID${id}. Add ?${TESTNET_QUERY} to the URL to load from api-dev.`
}

/**
 * Append or remove the testnet query flag (preserves other query keys).
 * @param {Record<string, unknown>} query
 * @param {boolean} useTestnet
 */
export function withTestnetQuery (query, useTestnet) {
  const next = { ...query }
  if (useTestnet) {
    next[TESTNET_QUERY] = ''
  } else {
    delete next[TESTNET_QUERY]
  }
  return next
}

/**
 * Legacy `/test/...` → canonical path + ?testnet
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {import('vue-router').RouteLocationRaw | null}
 */
export function legacyTestPathRedirect (to) {
  const segments = to.path.split('/').filter(Boolean)
  if (segments[0] !== 'test') return null

  const rest = segments.slice(1)
  let path = '/digging'
  if (rest.length === 0) {
    path = '/digging'
  } else if (rest.length === 1) {
    if (/^\d+$/.test(rest[0])) {
      path = `/${rest[0]}/digging`
    } else {
      path = `/${rest[0]}`
    }
  } else if (/^\d+$/.test(rest[0])) {
    path = `/${rest[0]}/${rest.slice(1).join('/')}`
  } else {
    path = `/${rest.join('/')}`
  }

  return {
    path,
    query: withTestnetQuery({ ...to.query }, true),
    hash: to.hash,
    replace: true,
  }
}
