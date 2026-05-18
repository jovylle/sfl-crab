const { connectLambda, getStore } = require('@netlify/blobs')

const PRACTICE_OWNER_ID = '1'
const API_ORIGIN = 'https://api.sunflower-land.com'
const STORE_NAME = 'practice-daily-patterns'

function getTodayUTC () {
  return new Date().toISOString().slice(0, 10)
}

function parseUTCDate (value) {
  if (typeof value !== 'string') return getTodayUTC()
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayUTC()
}

function normalizePracticePayload (data) {
  if (!data) {
    return { visitedFarmState: {} }
  }

  if (data.visitedFarmState) {
    return data
  }

  if (data.farm) {
    return { visitedFarmState: data.farm }
  }

  return { visitedFarmState: data }
}

function getSnapshotKey (utcDate) {
  return `${utcDate}.json`
}

function initBlobContext (event) {
  try {
    connectLambda(event)
  } catch (error) {
    // Netlify will already provide context in non-compat runtimes.
  }
}

async function getExistingDailySnapshot (utcDate) {
  const store = getStore(STORE_NAME)
  const key = getSnapshotKey(utcDate)
  return store.get(key, { type: 'json' })
}

async function fetchLivePracticePayload () {
  if (!process.env.SFL_API_KEY) {
    throw new Error('API key not configured')
  }

  const apiUrl = `${API_ORIGIN}/community/farms/${PRACTICE_OWNER_ID}`
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SFL_API_KEY,
    },
  })

  const payload = await response.json()
  if (!response.ok) {
    const error = new Error('Failed to fetch practice payload from source API')
    error.statusCode = response.status
    error.payload = payload
    throw error
  }

  return normalizePracticePayload(payload)
}

async function createAndStoreDailySnapshot (utcDate, { force = false } = {}) {
  const store = getStore(STORE_NAME)
  const key = getSnapshotKey(utcDate)

  if (!force) {
    const existing = await store.get(key, { type: 'json' })
    if (existing) {
      return { snapshot: existing, fromCache: true }
    }
  }

  const livePayload = await fetchLivePracticePayload()
  const patterns = livePayload.visitedFarmState?.desert?.digging?.patterns || []
  const snapshot = {
    date: utcDate,
    generatedAt: new Date().toISOString(),
    source: 'daily-snapshot',
    patterns,
    visitedFarmState: livePayload.visitedFarmState || {},
  }

  await store.setJSON(key, snapshot)

  return { snapshot, fromCache: false }
}

module.exports = {
  getTodayUTC,
  parseUTCDate,
  initBlobContext,
  getExistingDailySnapshot,
  createAndStoreDailySnapshot,
}
