const CORS_ORIGINS = [
  'https://projectmate.uft1.com',
  'https://d1g.uk',
  'https://beta.d1g.uk',
  'https://development.d1g.uk',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8888',
  'http://127.0.0.1:8888',
]

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const rateBuckets = new Map()

function corsHeaders (origin) {
  const allowed =
    !origin ||
    CORS_ORIGINS.includes(origin) ||
    /^https:\/\/[\w-]+--[\w-]+\.netlify\.app$/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin || CORS_ORIGINS[0] : CORS_ORIGINS[1],
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function getClientIp (event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function checkRateLimit (ip) {
  const now = Date.now()
  let bucket = rateBuckets.get(ip)
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 }
    rateBuckets.set(ip, bucket)
  }
  bucket.count += 1
  if (bucket.count > RATE_LIMIT) {
    const err = new Error('Too many requests')
    err.statusCode = 429
    throw err
  }
}

function web3formsKey () {
  return (
    process.env.WEB3FORMS_ACCESS_KEY ||
    process.env.VITE_PROJECTMATE_WEB3FORMS_KEY ||
    ''
  ).trim()
}

function buildWeb3FormsBody (payload) {
  const lines = [
    `Project: ${payload.projectId || 'unknown'}`,
    '',
    payload.message || '(no message)',
  ]

  if (payload.email) {
    lines.push('', `Reply-to: ${payload.email}`)
  }

  if (Array.isArray(payload.interactions) && payload.interactions.length) {
    lines.push('', 'Interactions:', ...payload.interactions.map((x) => `- ${x}`))
  }

  if (payload.meta && typeof payload.meta === 'object') {
    const { userAgent, viewport, parentHref } = payload.meta
    lines.push('', 'Meta:')
    if (parentHref) lines.push(`Page: ${parentHref}`)
    if (viewport) lines.push(`Viewport: ${viewport.w}×${viewport.h}`)
    if (userAgent) lines.push(`UA: ${userAgent}`)
  }

  if (payload.screenshot?.name) {
    lines.push('', `Screenshot: ${payload.screenshot.name} (attached in ProjectMate; not forwarded by email)`)
  }

  return {
    access_key: web3formsKey(),
    subject: 'SFL Crab feedback',
    from_name: 'd1g.uk',
    message: lines.join('\n'),
    replyto: payload.email || undefined,
  }
}

async function forwardToWeb3Forms (payload) {
  const key = web3formsKey()
  if (!key) {
    const err = new Error('Feedback is not configured on the server')
    err.statusCode = 503
    throw err
  }

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildWeb3FormsBody(payload)),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success !== true) {
    const err = new Error(data.message || 'Web3Forms submission failed')
    err.statusCode = 502
    throw err
  }

  return { ok: true }
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    checkRateLimit(getClientIp(event))
  } catch (err) {
    return {
      statusCode: err.statusCode || 429,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  if (!payload.message || typeof payload.message !== 'string' || !payload.message.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'message is required' }),
    }
  }

  try {
    await forwardToWeb3Forms(payload)
    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (error) {
    console.error('projectmate-feedback:', error)
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to send feedback',
      }),
    }
  }
}
