// API Configuration

import { STORAGE_KEYS } from '@/constants/storageKeys.js'

const STORAGE_KEY = STORAGE_KEYS.API_ENVIRONMENT.key

/** Example land on api-dev (no land ID 1 on test server). */
export const TEST_SERVER_EXAMPLE_LAND_ID = '913531074720548'

export const API_ENVIRONMENTS = {
  production: {
    label: 'Production',
    host: 'api.sunflower-land.com',
  },
  test: {
    label: 'Test server',
    host: 'api-dev.sunflower-land.com',
  },
}

export const API_CONFIG = {
  ENDPOINTS: {
    /** Public community snapshot — preferred for third-party tools. */
    primary: '/.netlify/functions/sfl-api/community/farms/',
    /** Visit endpoint — often 401 for non-owner farms; kept as fallback only. */
    backup: '/.netlify/functions/sfl-api/visit/',
  },
}

function readStoredEnvironment () {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'test' ? 'test' : 'production'
  } catch {
    return 'production'
  }
}

/** Current API target: `production` | `test` */
export function getApiEnvironment () {
  if (typeof window !== 'undefined') {
    return readStoredEnvironment()
  }
  return 'production'
}

export function isTestApiEnvironment () {
  return getApiEnvironment() === 'test'
}

export function setApiEnvironment (env) {
  const next = env === 'test' ? 'test' : 'production'
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(
      new CustomEvent('sfl-api-environment-changed', { detail: { env: next } }),
    )
  }
}

export function getApiHeaders () {
  const headers = { 'Content-Type': 'application/json' }
  if (isTestApiEnvironment()) {
    headers['x-sfl-api-env'] = 'test'
  }
  return headers
}

/** Separate cache per API so prod/test land snapshots do not mix. */
export function getLandDataStorageKey (landId) {
  const id = String(landId || '').trim()
  if (!id) return 'landData_guest'
  return isTestApiEnvironment() ? `landData_test_${id}` : `landData_${id}`
}

export function getLandCooldownStorageKey (landId) {
  const id = String(landId || '').trim()
  if (!id) return 'landCooldownEnd_guest'
  return isTestApiEnvironment()
    ? `landCooldownEnd_test_${id}`
    : `landCooldownEnd_${id}`
}
