import {
  HUB_ANONYMOUS_ID_KEY,
  HUB_DISPLAY_NAME_KEY,
  PRACTICE_NICKNAME_KEY,
  PRACTICE_SAVE_SCORES_KEY,
} from '@/constants/storageKeys.js'
import { hubAuthHeaders } from '@/features/hub/hubClient.js'
import { getHubDisplayName } from '@/composables/useHubSession.js'

const PRACTICE_RUNS_URL = '/api/practice-runs'

export function isPracticeSaveScoresEnabled () {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(PRACTICE_SAVE_SCORES_KEY)
  return v !== '0'
}

export function setPracticeSaveScoresEnabled (enabled) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PRACTICE_SAVE_SCORES_KEY, enabled ? '1' : '0')
}

export function getNickname () {
  if (typeof localStorage === 'undefined') return ''
  const fromHub = getHubDisplayName()
  if (fromHub) return fromHub.slice(0, 32)
  return localStorage.getItem(PRACTICE_NICKNAME_KEY) || ''
}

export function setNickname (name) {
  if (typeof localStorage === 'undefined') return
  const trimmed = String(name || '').trim().slice(0, 32)
  if (trimmed) {
    localStorage.setItem(PRACTICE_NICKNAME_KEY, trimmed)
    localStorage.setItem(HUB_DISPLAY_NAME_KEY, trimmed)
  } else {
    localStorage.removeItem(PRACTICE_NICKNAME_KEY)
  }
}

function getAnonymousId () {
  let id = localStorage.getItem(HUB_ANONYMOUS_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(HUB_ANONYMOUS_ID_KEY, id)
  }
  return id
}

/**
 * Submit a practice round to SFL Digging Hub (fire-and-forget friendly).
 * @param {object} payload
 * @param {string} payload.patternSource
 * @param {string|null} payload.patternDate
 * @param {string[]} payload.patternKeys
 * @param {number} payload.digCount
 * @param {number} payload.durationMs
 * @param {boolean} payload.victory
 * @param {number} payload.treasureCount
 * @param {import('../utils/buildDigTimeline.js').DigStep[]} [payload.digs]
 * @param {Array<{ key: string, tiles: Array<{ x: number, y: number }> }>} [payload.formations]
 * @returns {Promise<{ id?: string }|null>}
 */
export async function submitPracticeRun (payload) {
  if (!isPracticeSaveScoresEnabled()) return null

  const nickname = getNickname()

  const res = await fetch(PRACTICE_RUNS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...hubAuthHeaders(),
    },
    body: JSON.stringify({
      ...payload,
      formations: undefined, // not yet supported by the hub API
      anonymousId: getAnonymousId(),
      ...(nickname ? { nickname } : {}),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Failed to save practice score')
  }
  return data
}
