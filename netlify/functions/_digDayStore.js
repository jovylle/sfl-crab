const { getStore } = require('@netlify/blobs')

const STORE_NAME = 'dig-day-snapshots'
const MAX_MARK_EVENTS = 500
const MAX_BLOB_BYTES = 256 * 1024

function getTodayUTC () {
  return new Date().toISOString().slice(0, 10)
}

function parseUTCDate (value) {
  if (typeof value !== 'string') return getTodayUTC()
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayUTC()
}

function isValidLandId (landId) {
  return typeof landId === 'string' && /^\d{1,12}$/.test(landId)
}

function blobKey (landId, utcDate) {
  return `${landId}/${utcDate}.json`
}

function emptySnapshot (landId, utcDate) {
  return {
    v: 1,
    landId,
    utcDate,
    patterns: [],
    digs: [],
    markEvents: [],
    stats: { totalDigs: 0, treasureCount: 0 },
    updatedAt: null,
  }
}

function mergeMarkEvents (existing, incoming) {
  const bySeq = new Map()
  for (const e of existing || []) {
    if (e?.seq != null) bySeq.set(e.seq, e)
  }
  for (const e of incoming || []) {
    if (e?.seq != null) bySeq.set(e.seq, e)
  }
  const merged = [...bySeq.values()].sort((a, b) => a.seq - b.seq)
  return merged.slice(-MAX_MARK_EVENTS)
}

function shouldReplaceDigs (existing, incoming) {
  if (!existing?.digs?.length) return true
  if (!incoming?.digs?.length) return false

  const existingLen = existing.digs.length
  const incomingLen = incoming.digs.length
  if (incomingLen > existingLen) return true
  if (incomingLen < existingLen) return false

  const existingAt = existing.updatedAt ? Date.parse(existing.updatedAt) : 0
  const incomingAt = incoming.updatedAt ? Date.parse(incoming.updatedAt) : 0
  return incomingAt >= existingAt
}

function mergeDigDay (existing, incoming) {
  const landId = incoming.landId
  const utcDate = incoming.utcDate
  const base = existing || emptySnapshot(landId, utcDate)

  const replaceDigs = shouldReplaceDigs(base, incoming)

  const merged = {
    v: 1,
    landId,
    utcDate,
    patterns: replaceDigs
      ? [...(incoming.patterns || [])]
      : [...(base.patterns || [])],
    digs: replaceDigs ? [...(incoming.digs || [])] : [...(base.digs || [])],
    markEvents: mergeMarkEvents(base.markEvents, incoming.markEvents),
    stats: replaceDigs
      ? { ...(incoming.stats || {}) }
      : { ...(base.stats || {}) },
    updatedAt: new Date().toISOString(),
  }

  const json = JSON.stringify(merged)
  if (json.length > MAX_BLOB_BYTES) {
    const err = new Error('Snapshot too large')
    err.statusCode = 413
    throw err
  }

  return merged
}

async function getDigDay (landId, utcDate) {
  const store = getStore(STORE_NAME)
  return store.get(blobKey(landId, utcDate), { type: 'json' })
}

async function saveDigDay (payload) {
  const landId = String(payload.landId || '')
  const utcDate = parseUTCDate(payload.utcDate)

  if (!isValidLandId(landId)) {
    const err = new Error('Invalid landId')
    err.statusCode = 400
    throw err
  }

  const store = getStore(STORE_NAME)
  const existing = await getDigDay(landId, utcDate)
  const merged = mergeDigDay(existing, {
    ...payload,
    landId,
    utcDate,
  })

  await store.setJSON(blobKey(landId, utcDate), merged)
  return merged
}

module.exports = {
  STORE_NAME,
  getTodayUTC,
  parseUTCDate,
  isValidLandId,
  emptySnapshot,
  getDigDay,
  saveDigDay,
  mergeDigDay,
}
