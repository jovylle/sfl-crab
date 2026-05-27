import { hubAuthHeaders } from '@/features/hub/hubClient.js'

const API_BASE = '/api/dig-day'

export class DigDayApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number }} [options]
   */
  constructor (message, { status } = {}) {
    super(message)
    this.name = 'DigDayApiError'
    this.status = status
  }
}

/**
 * @param {string} landId
 * @param {string} utcDate
 */
export async function fetchDigDay (landId, utcDate) {
  const params = new URLSearchParams({ landId: String(landId), utcDate })
  const res = await fetch(`${API_BASE}?${params}`, {
    method: 'GET',
    headers: hubAuthHeaders(),
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
    headers: hubAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message =
      err.error ||
      (res.status === 413
        ? 'Dig day is too large to save (256 KB limit). Try clearing marks or extra history.'
        : `Failed to save dig day (${res.status})`)
    throw new DigDayApiError(message, { status: res.status })
  }

  return res.json()
}
