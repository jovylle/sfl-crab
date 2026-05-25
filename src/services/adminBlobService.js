const ADMIN_API = '/api/admin-blobs'
const SESSION_KEY = 'sfl-admin-password'

export function getStoredAdminPassword () {
  if (typeof sessionStorage === 'undefined') return ''
  return sessionStorage.getItem(SESSION_KEY) || ''
}

export function setStoredAdminPassword (password) {
  if (typeof sessionStorage === 'undefined') return
  if (password) {
    sessionStorage.setItem(SESSION_KEY, password)
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

export function clearAdminSession () {
  setStoredAdminPassword('')
}

function authHeaders (password) {
  return {
    Authorization: `Bearer ${password}`,
  }
}

async function adminFetch (password, path, options = {}) {
  const url = new URL(ADMIN_API, window.location.origin)
  for (const [key, value] of Object.entries(path)) {
    if (value != null && value !== '') url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      ...authHeaders(password),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(payload.error || `Admin API ${response.status}`)
    err.status = response.status
    err.payload = payload
    throw err
  }

  return payload
}

export async function verifyAdminPassword (password) {
  return adminFetch(password, { action: 'stores' })
}

export async function listAdminBlobs (password, store, prefix = '') {
  return adminFetch(password, { action: 'list', store, prefix })
}

export async function getAdminBlob (password, store, key) {
  return adminFetch(password, { action: 'get', store, key })
}

export async function deleteAdminBlob (password, store, key) {
  return adminFetch(password, { action: 'delete', store, key }, { method: 'DELETE' })
}

export async function rebuildPracticeSnapshot (password, utcDate, { force = false } = {}) {
  return adminFetch(password, {
    action: 'rebuild',
    store: 'practice-daily-patterns',
    utcDate,
    force: force ? '1' : '0',
  }, { method: 'POST' })
}
