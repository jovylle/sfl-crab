const PRACTICE_RUNS_URL = '/api/practice-runs'
const ANON_KEY = 'sfl-hub-anonymous-id'
const SESSION_KEY = 'sfl-hub-session'
const SAVE_SCORES_KEY = 'sfl-practice-save-scores'

export function isPracticeSaveScoresEnabled () {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(SAVE_SCORES_KEY)
  return v !== '0'
}

export function setPracticeSaveScoresEnabled (enabled) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SAVE_SCORES_KEY, enabled ? '1' : '0')
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
 * Submit a practice round score to SFL Digging Hub (fire-and-forget friendly).
 * @param {object} payload
 */
export async function submitPracticeRun (payload) {
  if (!isPracticeSaveScoresEnabled()) return null

  const res = await fetch(PRACTICE_RUNS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      ...payload,
      anonymousId: getAnonymousId(),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Failed to save practice score')
  }
  return data
}
