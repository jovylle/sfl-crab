import { fetchHubApi } from '@/features/hub/hubClient.js'

const API_BASE = '/api/hub-auth'

export class HubAuthError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number }} [options]
   */
  constructor (message, { status } = {}) {
    super(message)
    this.name = 'HubAuthError'
    this.status = status
  }
}

/**
 * @param {string} email
 */
export async function sendEmailOtp (email) {
  const { res, data } = await fetchHubApi(`${API_BASE}/otp/send`, {
    method: 'POST',
    body: JSON.stringify({ email: String(email || '').trim().toLowerCase() }),
  })
  if (!res.ok) {
    throw new HubAuthError(
      data?.error || data?.message || 'Could not send code',
      { status: res.status },
    )
  }
  return data
}

/**
 * @param {string} email
 * @param {string} code
 * @param {string} [anonymousId]
 */
export async function verifyEmailOtp (email, code, anonymousId) {
  const { res, data } = await fetchHubApi(`${API_BASE}/otp/verify`, {
    method: 'POST',
    body: JSON.stringify({
      email: String(email || '').trim().toLowerCase(),
      code: String(code || '').trim(),
      ...(anonymousId ? { anonymousId } : {}),
    }),
  })
  if (!res.ok) {
    throw new HubAuthError(
      data?.error || data?.message || 'Invalid or expired code',
      { status: res.status },
    )
  }
  return data
}

/**
 * @param {string} returnUrl Absolute or site-relative URL to return after OAuth
 */
export async function getGoogleAuthStartUrl (returnUrl) {
  const params = new URLSearchParams({
    returnUrl: returnUrl || `${window.location.origin}/auth/callback`,
  })
  const { res, data } = await fetchHubApi(
    `${API_BASE}/google/start?${params}`,
    { method: 'GET' },
  )
  if (!res.ok) {
    throw new HubAuthError(
      data?.error || data?.message || 'Google sign-in is not available yet',
      { status: res.status },
    )
  }
  const url = data?.url || data?.redirectUrl
  if (!url) {
    throw new HubAuthError('Hub did not return a Google sign-in URL', { status: res.status })
  }
  return url
}

/**
 * @param {string} [anonymousId]
 */
export async function fetchMe (anonymousId) {
  const qs = anonymousId
    ? `?${new URLSearchParams({ anonymousId })}`
    : ''
  const { res, data } = await fetchHubApi(`${API_BASE}/me${qs}`, { method: 'GET' })
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    throw new HubAuthError(
      data?.error || data?.message || 'Could not load account',
      { status: res.status },
    )
  }
  return data?.user ?? data
}

export async function logoutOnHub () {
  const { res, data } = await fetchHubApi(`${API_BASE}/logout`, {
    method: 'POST',
    body: '{}',
  })
  if (!res.ok && res.status !== 401) {
    throw new HubAuthError(data?.error || 'Logout failed', { status: res.status })
  }
}
