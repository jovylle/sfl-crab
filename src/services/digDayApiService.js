const API_BASE = '/api/dig-day'

/**
 * @param {string} landId
 * @param {string} utcDate
 */
export async function fetchDigDay (landId, utcDate) {
  const params = new URLSearchParams({ landId: String(landId), utcDate })
  const res = await fetch(`${API_BASE}?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  const data = await res.json().catch(() => null)

  if (res.status === 404) {
    return data
  }

  if (!res.ok) {
    throw new Error(data?.error || `Failed to load dig day (${res.status})`)
  }

  return data
}

/**
 * @param {object} payload
 */
export async function saveDigDay (payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to save dig day (${res.status})`)
  }

  return res.json()
}
