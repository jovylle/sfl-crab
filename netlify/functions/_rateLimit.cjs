const WINDOW_MS = 60_000

function clientIp (event) {
  return (
    event.headers['cf-connecting-ip'] ||        // set by Cloudflare; client-controlled if the function is reached directly on *.netlify.app
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  )
}

const buckets = new Map()
let lastSweep = 0

function sweep (now) {
  if (now - lastSweep < WINDOW_MS) return
  lastSweep = now
  for (const [k, b] of buckets) if (now - b.start > WINDOW_MS) buckets.delete(k)
}

function checkRateLimit (event, limit) {
  const now = Date.now()
  sweep(now)
  const ip = clientIp(event)
  let bucket = buckets.get(ip)
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 }
    buckets.set(ip, bucket)
  }
  bucket.count += 1
  if (bucket.count > limit) {
    const err = new Error('Too many requests — please retry in a moment')
    err.statusCode = 429
    err.retryAfter = Math.ceil((bucket.start + WINDOW_MS - now) / 1000)
    throw err
  }
}

module.exports = { checkRateLimit, clientIp }
