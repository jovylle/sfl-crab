import {
  getApiEnvironment,
  isTestApiEnvironment,
  setApiEnvironment,
} from '@/config/api.js'

/** URL path prefix for api-dev land routes (shareable links). */
export const TEST_PATH_PREFIX = 'test'

export function isTestApiPath (path) {
  const normalized = String(path || '').replace(/^\//, '')
  return (
    normalized === TEST_PATH_PREFIX
    || normalized.startsWith(`${TEST_PATH_PREFIX}/`)
  )
}

/**
 * @param {string} [landId]
 * @param {{ test?: boolean }} [options]
 */
export function landDiggingPath (landId, { test = isTestApiEnvironment() } = {}) {
  if (landId) {
    return test
      ? `/${TEST_PATH_PREFIX}/${landId}/digging`
      : `/${landId}/digging`
  }
  return test ? `/${TEST_PATH_PREFIX}/digging` : '/digging'
}

/**
 * @param {string} [landId]
 * @param {string} page — e.g. `details`, `practice`, `todays-checklist`
 * @param {{ test?: boolean }} [options]
 */
export function landPagePath (landId, page, { test = isTestApiEnvironment() } = {}) {
  const segment = String(page || '').replace(/^\//, '')
  if (landId) {
    return test
      ? `/${TEST_PATH_PREFIX}/${landId}/${segment}`
      : `/${landId}/${segment}`
  }
  return test ? `/${TEST_PATH_PREFIX}/${segment}` : `/${segment}`
}

export const ROUTE_BY_PAGE = {
  digging: { prod: 'Digging', test: 'TestDigging' },
  guestDigging: { prod: 'GuestDigging', test: 'TestGuestDigging' },
  details: { prod: 'LandDetailsWithId', test: 'TestLandDetailsWithId' },
  detailsNoId: { prod: 'LandDetailsNoId', test: 'TestLandDetailsNoId' },
  checklist: { prod: 'TodaysChecklistWithId', test: 'TestTodaysChecklistWithId' },
  checklistNoId: { prod: 'TodaysChecklist', test: 'TestTodaysChecklist' },
  practice: { prod: 'PracticeWithId', test: 'TestPracticeWithId' },
  practiceNoId: { prod: 'Practice', test: 'TestPractice' },
}

/**
 * Vue Router location for a land-scoped page.
 * @param {keyof typeof ROUTE_BY_PAGE} page
 * @param {{ landId?: string, test?: boolean }} [options]
 */
export function resolveLandRoute (page, { landId, test = isTestApiEnvironment() } = {}) {
  const map = ROUTE_BY_PAGE[page]
  const name = test ? map.test : map.prod
  if (landId) {
    return { name, params: { landId: String(landId) } }
  }
  return { name }
}

/** Add or remove `/test` from the current path (keeps query string). */
export function swapTestPrefixInPath (fullPath, useTest) {
  const [path, query] = String(fullPath || '/').split('?')
  const q = query ? `?${query}` : ''
  let segments = path.split('/').filter(Boolean)
  const hasTest = segments[0] === TEST_PATH_PREFIX

  if (useTest && !hasTest) {
    segments = [TEST_PATH_PREFIX, ...segments]
  } else if (!useTest && hasTest) {
    segments = segments.slice(1)
  }

  const next = segments.length ? `/${segments.join('/')}` : '/'
  return next + q
}

/** Apply route meta / path prefix to API environment (URL is source of truth). */
export function syncApiEnvFromRoute (route) {
  const fromMeta = route.meta?.apiEnv
  if (fromMeta === 'test' || fromMeta === 'production') {
    if (getApiEnvironment() !== fromMeta) {
      setApiEnvironment(fromMeta)
    }
    return
  }

  if (isTestApiPath(route.path) && getApiEnvironment() !== 'test') {
    setApiEnvironment('test')
  }
}
