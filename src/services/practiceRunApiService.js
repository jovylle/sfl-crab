const PRACTICE_RUN_URL = '/api/practice-run'

/**
 * Fetch a single practice run by id from the SFL Digging Hub.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function fetchPracticeRun (id) {
  if (!id) throw new Error('Missing practice run id')

  const res = await fetch(`${PRACTICE_RUN_URL}?id=${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Failed to load practice run')
  }
  return data
}
