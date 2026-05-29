import {
  getApiEnvironment,
  isTestApiEnvironment,
  setApiEnvironment,
} from '@/config/api.js'
import { hasTestnetQuery, TESTNET_QUERY, withTestnetQuery } from '@/utils/testnet.js'

export { TESTNET_QUERY, hasTestnetQuery, withTestnetQuery }

/**
 * @param {string} [landId]
 * @param {{ test?: boolean }} [options]
 */
export function landDiggingPath (landId, { test = isTestApiEnvironment() } = {}) {
  const path = landId ? `/${landId}/digging` : '/digging'
  return test ? `${path}?${TESTNET_QUERY}` : path
}

/**
 * @param {string} [landId]
 * @param {string} page — e.g. `details`, `practice`, `todays-checklist`
 * @param {{ test?: boolean }} [options]
 */
export function landPagePath (landId, page, { test = isTestApiEnvironment() } = {}) {
  const segment = String(page || '').replace(/^\//, '')
  const path = landId ? `/${landId}/${segment}` : `/${segment}`
  return test ? `${path}?${TESTNET_QUERY}` : path
}

export const ROUTE_BY_PAGE = {
  digging: 'Digging',
  guestDigging: 'GuestDigging',
  details: 'LandDetailsWithId',
  detailsNoId: 'LandDetailsNoId',
  checklist: 'TodaysChecklistWithId',
  checklistNoId: 'TodaysChecklist',
  practice: 'PracticeWithId',
  practiceNoId: 'Practice',
}

/**
 * Vue Router location for a land-scoped page.
 * @param {keyof typeof ROUTE_BY_PAGE} page
 * @param {{ landId?: string, test?: boolean, query?: Record<string, unknown> }} [options]
 */
export function resolveLandRoute (
  page,
  { landId, test = isTestApiEnvironment(), query = {} } = {},
) {
  const name = ROUTE_BY_PAGE[page]
  const location = landId
    ? { name, params: { landId: String(landId) } }
    : { name }

  const q = withTestnetQuery({ ...query }, test)
  if (Object.keys(q).length > 0) {
    location.query = q
  }
  return location
}

/** Add or remove `?testnet` on the current route (path unchanged). */
export function swapTestnetOnRoute (route, useTest) {
  return {
    path: route.path,
    query: withTestnetQuery({ ...route.query }, useTest),
    hash: route.hash,
  }
}

/** Apply `?testnet` in the URL to API environment. */
export function syncApiEnvFromRoute (route) {
  if (hasTestnetQuery(route.query, route.fullPath)) {
    if (getApiEnvironment() !== 'test') {
      setApiEnvironment('test')
    }
    return
  }

  if (getApiEnvironment() !== 'production') {
    setApiEnvironment('production')
  }
}
