/**
 * ProjectMate proxy: same-origin /api/projectmate/* → Worker, sub-path preserved.
 * Keeps the Worker URL + admin secret server-side (set PROJECTMATE_WORKER_URL
 * and PROJECTMATE_ADMIN_KEY in Netlify site env, never in client JS).
 * GET  /issues*             → public list (email/ownerKey stripped by Worker)
 * GET  /issues/moderation*  → needs x-projectmate-admin (unlock prompt sends it)
 * POST /issues              → new submission (starts Hidden)
 * PATCH /issues/:id/status  → {status?, allowPublicDisplay?} (admin only)
 * GET  /issues/:id/screenshot → serves only when published (else Worker 404s)
 */
const WORKER_URL = (process.env.PROJECTMATE_WORKER_URL || '').replace(/\/$/, '')
const ADMIN_KEY = process.env.PROJECTMATE_ADMIN_KEY || ''

const CORS_ORIGINS = [
  'https://projectmate.uft1.com',
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
]

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin) ||
    // Local dev: overlay dev server (e.g. http://localhost:5174) + vite (5199).
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[1],
    'Access-Control-Allow-Headers': 'Content-Type, Accept, x-projectmate-admin, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  }
}

function upstreamPath (event) {
  // /.netlify/functions/projectmate-feedback/issues?x → /issues?x
  const raw = event.rawPath || event.path || ''
  const direct = raw.replace(/^\/\.netlify\/functions\/projectmate-feedback/, '') || '/'
  if (direct.startsWith('/issues')) return direct
  // /api/projectmate/issues?x → /issues?x (redirect rule passes :splat)
  const params = event.pathParameters || {}
  const splat = params.splat || params[0] || ''
  const path = '/' + String(splat).replace(/^\/+/, '')
  if (path.startsWith('/issues')) return path
  return '/issues' + (path === '/' ? '' : path)
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (!WORKER_URL) {
    return {
      statusCode: 503,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        error: 'ProjectMate proxy not configured (PROJECTMATE_WORKER_URL missing).',
        code: 'PROXY_NOT_CONFIGURED',
      }),
    }
  }

  const qs = event.rawQuery ? `?${event.rawQuery}` : ''
  const target = `${WORKER_URL}${upstreamPath(event)}${qs}`
  const incomingAdmin =
    event.headers['x-projectmate-admin'] ||
    event.headers['X-Projectmate-Admin'] ||
    ''

  try {
    const init = {
      method: event.httpMethod,
      headers: { 'Content-Type': 'application/json' },
    }
    // Moderation calls carry the key the admin typed at the unlock prompt.
    // Reads use it as-is; writes prefer the server-held secret (never client).
    if (event.httpMethod === 'PATCH' && ADMIN_KEY) {
      init.headers['x-projectmate-admin'] = ADMIN_KEY
    } else if (incomingAdmin) {
      init.headers['x-projectmate-admin'] = incomingAdmin
    }
    if (event.body) init.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body

    const upstream = await fetch(target, init)
    const text = await upstream.text()
    return {
      statusCode: upstream.status,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: text,
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'ProjectMate upstream unreachable.' }),
    }
  }
}
