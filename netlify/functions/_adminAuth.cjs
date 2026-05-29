function getHeader (headers, key) {
  if (!headers) return ''
  return headers[key] || headers[key.toLowerCase()] || ''
}

function getAdminPassword () {
  return process.env.ADMIN_PASSWORD || ''
}

function isAdminConfigured () {
  return Boolean(getAdminPassword())
}

function isAuthorized (event) {
  const expected = getAdminPassword()
  if (!expected) return false

  const auth = getHeader(event?.headers, 'authorization')
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7) === expected
  }

  return getHeader(event?.headers, 'x-admin-password') === expected
}

function adminJson (statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

function notConfiguredResponse () {
  return adminJson(503, { error: 'Admin not available' })
}

function unauthorizedResponse () {
  return adminJson(401, { error: 'Unauthorized' })
}

module.exports = {
  isAdminConfigured,
  isAuthorized,
  adminJson,
  notConfiguredResponse,
  unauthorizedResponse,
}
