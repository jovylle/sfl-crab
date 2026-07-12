/**
 * Central registry of browser localStorage keys used by d1g.uk.
 * Guest keys stay active without sign-in; hub session keys apply after passwordless login.
 */

/** @type {'guest' | 'guest_or_signed_in' | 'signed_in'} */
export const STORAGE_AUDIENCE = {
  GUEST: 'guest',
  GUEST_OR_SIGNED_IN: 'guest_or_signed_in',
  SIGNED_IN: 'signed_in',
}

/**
 * Fixed keys (not parameterized).
 * @type {Record<string, { description: string, audience: string }>}
 */
export const STORAGE_KEYS = {
  /** JWT from Hub auth (Bearer). v1: localStorage on d1g.uk only. */
  HUB_SESSION: {
    key: 'sfl-hub-session',
    description: 'Hub auth JWT',
    audience: STORAGE_AUDIENCE.SIGNED_IN,
  },
  /** Cached Hub user profile JSON `{ id, email, displayName, ... }`. */
  HUB_USER: {
    key: 'sfl-hub-user',
    description: 'Hub user profile snapshot',
    audience: STORAGE_AUDIENCE.SIGNED_IN,
  },
  /** Guest or signed-in display name on dig-day payloads. */
  HUB_DISPLAY_NAME: {
    key: 'sfl-hub-display-name',
    description: 'Display name for dig-day / hub attribution',
    audience: STORAGE_AUDIENCE.GUEST_OR_SIGNED_IN,
  },
  /** Stable anonymous id for practice runs before sign-in. */
  HUB_ANONYMOUS_ID: {
    key: 'sfl-hub-anonymous-id',
    description: 'Practice hub anonymous UUID',
    audience: STORAGE_AUDIENCE.GUEST,
  },
  /** @deprecated Migrated to HUB_DISPLAY_NAME on boot. */
  PRACTICE_NICKNAME: {
    key: 'sfl-practice-nickname',
    description: 'Legacy practice nickname',
    audience: STORAGE_AUDIENCE.GUEST_OR_SIGNED_IN,
  },
  PRACTICE_SAVE_SCORES: {
    key: 'sfl-practice-save-scores',
    description: 'Practice score submit enabled (`1` / `0`)',
    audience: STORAGE_AUDIENCE.GUEST,
  },
  API_ENVIRONMENT: {
    key: 'sfl-api-environment',
    description: 'SFL API target: production | test',
    audience: STORAGE_AUDIENCE.GUEST,
  },
  THEME: {
    key: 'theme',
    description: 'DaisyUI theme name',
    audience: STORAGE_AUDIENCE.GUEST,
  },
  CHECKLIST_LAND_ID: {
    key: 'todays-checklist:landId',
    description: 'Last land id on checklist page',
    audience: STORAGE_AUDIENCE.GUEST,
  },
  CHECKLIST_NPCS: {
    key: 'todays-checklist:selectedNpcIds',
    description: 'Selected NPC ids on checklist',
    audience: STORAGE_AUDIENCE.GUEST,
  },
}

/** Raw string keys for imports. */
export const HUB_SESSION_KEY = STORAGE_KEYS.HUB_SESSION.key
export const HUB_USER_KEY = STORAGE_KEYS.HUB_USER.key
export const HUB_DISPLAY_NAME_KEY = STORAGE_KEYS.HUB_DISPLAY_NAME.key
export const HUB_ANONYMOUS_ID_KEY = STORAGE_KEYS.HUB_ANONYMOUS_ID.key
export const PRACTICE_NICKNAME_KEY = STORAGE_KEYS.PRACTICE_NICKNAME.key
export const PRACTICE_SAVE_SCORES_KEY = STORAGE_KEYS.PRACTICE_SAVE_SCORES.key

/**
 * Land snapshot cache (see `getLandDataStorageKey` in config/api.js).
 * @param {string} landId
 * @param {boolean} [testApi]
 */
export function landDataKey (landId, testApi = false) {
  const id = String(landId || '').trim()
  if (!id) return 'landData_guest'
  return testApi ? `landData_test_${id}` : `landData_${id}`
}

/**
 * Land sync cooldown end timestamp.
 * @param {string} landId
 * @param {boolean} [testApi]
 */
export function landCooldownKey (landId, testApi = false) {
  const id = String(landId || '').trim()
  if (!id) return 'landCooldownEnd_guest'
  return testApi ? `landCooldownEnd_test_${id}` : `landCooldownEnd_${id}`
}

/**
 * Custom grid hints for a land (daily).
 * @param {string} landId
 */
export function gridCustomHintsKey (landId) {
  return `gridCustomHints_${landId}`
}

/**
 * Mark journal events for land + UTC date.
 * @param {string} landId
 * @param {string} utcDate
 */
export function markJournalKey (landId, utcDate) {
  return `markJournal_${landId}_${utcDate}`
}

/**
 * UI preference per land.
 * @param {string} landId
 * @param {'showTreasureOrder' | 'hideLandIdInUrl' | 'showPrediction'} pref
 */
export function landUiPrefKey (landId, pref) {
  return `${pref}-${landId}`
}
