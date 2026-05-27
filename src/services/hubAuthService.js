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
 * Try auth endpoints in order (first non-404 response wins).
 * Helps frontend stay compatible across hub API rollout versions.
 * @param {string[]} paths
 * @param {RequestInit} init
 */
async function requestWithPathFallback (paths, init) {
  let lastRes = null
  let lastData = null

  for (const path of paths) {
    const { res, data } = await fetchHubApi(`${API_BASE}${path}`, init)
    lastRes = res
    lastData = data
    if (res.status === 404) continue
    return { res, data, path }
  }

  return { res: lastRes, data: lastData, path: paths[paths.length - 1] }
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
    const fallback =
      res.status === 404
        ? 'Sign-in is not available on the hub API yet. Try again after the hub auth service is deployed.'
        : 'Could not send code'
    throw new HubAuthError(
      data?.error || data?.message || fallback,
      { status: res.status },
    )
  }
  return data
}

/**
 * Start an email-based approval flow (sign-up/login unified).
 * Falls back to OTP send when approve-link endpoints are unavailable.
 * @param {string} email
 * @param {{ anonymousId?: string, returnUrl?: string }} [options]
 */
export async function requestEmailApproval (email, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const body = {
    email: normalizedEmail,
    ...(options.anonymousId ? { anonymousId: options.anonymousId } : {}),
    ...(options.returnUrl ? { returnUrl: options.returnUrl } : {}),
  }
  const { res, data } = await requestWithPathFallback(
    ['/approve/start', '/magic/start', '/magic-link/start', '/otp/send'],
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )

  if (!res?.ok) {
    const fallback =
      res?.status === 404
        ? 'Sign-in is not available on the hub API yet. Try again after the hub auth service is deployed.'
        : 'Could not send approval email'
    throw new HubAuthError(
      data?.error || data?.message || fallback,
      { status: res?.status },
    )
  }

  return data
}

/**
 * Complete or poll an approval flow after user clicks email link.
 * Returns session payload when approved (token/accessToken expected).
 * @param {{ email: string, anonymousId?: string, requestId?: string, challengeId?: string, flowId?: string }} payload
 */
export async function checkEmailApproval (payload) {
  const { res, data } = await requestWithPathFallback(
    ['/approve/check', '/approve/complete', '/magic/check', '/magic/complete', '/magic-link/verify'],
    {
      method: 'POST',
      body: JSON.stringify({
        email: String(payload?.email || '').trim().toLowerCase(),
        ...(payload?.anonymousId ? { anonymousId: payload.anonymousId } : {}),
        ...(payload?.requestId ? { requestId: payload.requestId } : {}),
        ...(payload?.challengeId ? { challengeId: payload.challengeId } : {}),
        ...(payload?.flowId ? { flowId: payload.flowId } : {}),
      }),
    },
  )
  if (!res.ok) {
    throw new HubAuthError(
      data?.error || data?.message || 'Approval not completed yet',
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
