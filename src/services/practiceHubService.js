const PRACTICE_RUNS_URL = '/api/practice-runs'
const ANON_KEY = 'sfl-hub-anonymous-id'
const SESSION_KEY = 'sfl-hub-session'
const SAVE_SCORES_KEY = 'sfl-practice-save-scores'
const NICKNAME_KEY = 'sfl-practice-nickname'

export function isPracticeSaveScoresEnabled () {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(SAVE_SCORES_KEY)
  return v !== '0'
}

export function setPracticeSaveScoresEnabled (enabled) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SAVE_SCORES_KEY, enabled ? '1' : '0')
}

export function getNickname () {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(NICKNAME_KEY) || ''
}

export function setNickname (name) {
  if (typeof localStorage === 'undefined') return
  const trimmed = String(name || '').trim().slice(0, 32)
  if (trimmed) {
    localStorage.setItem(NICKNAME_KEY, trimmed)
  } else {
    localStorage.removeItem(NICKNAME_KEY)
  }
}

function getAnonymousId () {
  let id = localStorage.getItem(ANON_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ANON_KEY, id)
  }
  return id
}

function authHeaders () {
  const token = localStorage.getItem(SESSION_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
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
      ...authHeaders(),
    },
    body: JSON.stringify({
      ...payload,
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
