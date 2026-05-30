import { fetchHubApi } from '@/features/hub/hubClient.js'

const API_BASE = '/api/hub-profile'

export class HubProfileError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number }} [options]
   */
  constructor (message, { status } = {}) {
    super(message)
    this.name = 'HubProfileError'
    this.status = status
  }
}

async function request (path, init = {}) {
  const { res, data } = await fetchHubApi(`${API_BASE}${path}`, init)
  if (!res.ok) {
    throw new HubProfileError(
      data?.error || data?.message || 'Hub profile request failed',
      { status: res.status },
    )
  }
  return data
}

export function fetchProfile () {
  return request('', { method: 'GET' })
}

export function updateProfileNickname (nickname) {
  return request('', {
    method: 'PUT',
    body: JSON.stringify({ nickname }),
  })
}

export function fetchSavedLands () {
  return request('/saved-lands', { method: 'GET' })
}

export function saveLandId (landId) {
  return request('/saved-lands', {
    method: 'POST',
    body: JSON.stringify({ landId: String(landId || '').trim() }),
  })
}

export function removeLandId (landId) {
  const id = encodeURIComponent(String(landId || '').trim())
  return request(`/saved-lands/${id}`, { method: 'DELETE' })
}
