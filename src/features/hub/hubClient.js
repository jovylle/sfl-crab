import {
  HUB_SESSION_KEY,
} from '@/constants/storageKeys.js'

/**
 * Read Bearer token for Hub API calls (v1: localStorage on this origin).
 * Phase 5: may switch to cookie + credentials: 'include' only.
 */
export function getHubBearerToken () {
  if (typeof localStorage === 'undefined') return null
  const token = localStorage.getItem(HUB_SESSION_KEY)?.trim()
  return token || null
}

/**
 * @param {Record<string, string>} [extra]
 */
export function hubAuthHeaders (extra = {}) {
  const token = getHubBearerToken()
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

/**
 * @param {string} path Path under /api (e.g. `/api/hub-auth/me`)
 * @param {RequestInit} [init]
 */
export async function fetchHubApi (path, init = {}) {
  const headers = {
    ...hubAuthHeaders(),
    ...(init.headers || {}),
  }
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(path, {
    ...init,
    headers,
    // Future (hub.d1g.uk SSO): credentials: 'include' when Hub sets HttpOnly cookie on .d1g.uk
  })

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  return { res, data }
}
