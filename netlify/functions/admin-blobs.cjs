const { getStore } = require('@netlify/blobs')
const {
  isAdminConfigured,
  isAuthorized,
  adminJson,
  notConfiguredResponse,
  unauthorizedResponse,
} = require('./_adminAuth.cjs')
const {
  initBlobContext,
  parseUTCDate,
  createAndStoreDailySnapshot,
} = require('./_practiceDailyStore.cjs')

const STORES = [
  {
    id: 'practice-daily-patterns',
    label: 'Practice daily patterns',
    keyHint: 'YYYY-MM-DD.json',
    canRebuild: true,
  },
  {
    id: 'dig-day-snapshots',
    label: 'Dig day snapshots (legacy)',
    keyHint: 'landId/YYYY-MM-DD.json',
    canRebuild: false,
  },
  {
    id: 'feedback-reports',
    label: 'Feedback reports',
    keyHint: 'timestamp-id.json',
    canRebuild: false,
  },
]

function findStore (storeId) {
  return STORES.find(s => s.id === storeId)
}

async function listStoreKeys (storeId, prefix = '') {
  const store = getStore(storeId)
  const options = {}
  if (prefix) options.prefix = prefix
  const { blobs } = await store.list(options)
  return blobs
    .map(b => ({
      key: b.key,
      etag: b.etag,
      insertedAt: b.insertedAt,
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
}

async function getStoreBlob (storeId, key) {
  const store = getStore(storeId)
  const json = await store.get(key, { type: 'json' })
  if (json != null) {
    return { key, contentType: 'json', data: json }
  }

  const text = await store.get(key, { type: 'text' })
  return { key, contentType: 'text', data: text }
}

async function deleteStoreBlob (storeId, key) {
  const store = getStore(storeId)
  await store.delete(key)
}

exports.handler = async (event) => {
  initBlobContext(event)

  if (!isAdminConfigured()) {
    return notConfiguredResponse()
  }

  if (!isAuthorized(event)) {
    return unauthorizedResponse()
  }

  const params = event.queryStringParameters || {}
  const action = params.action || 'stores'
  const method = event.httpMethod || 'GET'

  try {
    if (action === 'stores' && method === 'GET') {
      return adminJson(200, { stores: STORES })
    }

    const storeId = params.store
    const storeMeta = findStore(storeId)

    if (action === 'list' && method === 'GET') {
      if (!storeMeta) {
        return adminJson(400, { error: 'Unknown store' })
      }
      const keys = await listStoreKeys(storeId, params.prefix || '')
      return adminJson(200, {
        store: storeMeta,
        prefix: params.prefix || '',
        keys,
        count: keys.length,
      })
    }

    if (action === 'get' && method === 'GET') {
      if (!storeMeta) {
        return adminJson(400, { error: 'Unknown store' })
      }
      const key = params.key
      if (!key) {
        return adminJson(400, { error: 'Missing key' })
      }
      const blob = await getStoreBlob(storeId, key)
      return adminJson(200, blob)
    }

    if (action === 'delete' && method === 'DELETE') {
      if (!storeMeta) {
        return adminJson(400, { error: 'Unknown store' })
      }
      const key = params.key
      if (!key) {
        return adminJson(400, { error: 'Missing key' })
      }
      await deleteStoreBlob(storeId, key)
      return adminJson(200, { ok: true, deleted: key })
    }

    if (action === 'rebuild' && method === 'POST') {
      if (storeId !== 'practice-daily-patterns') {
        return adminJson(400, { error: 'Rebuild only supported for practice-daily-patterns' })
      }
      const utcDate = parseUTCDate(params.utcDate)
      const force = params.force === '1'
      const { snapshot, fromCache } = await createAndStoreDailySnapshot(utcDate, { force })
      return adminJson(200, {
        ok: true,
        date: snapshot.date,
        generatedAt: snapshot.generatedAt,
        patternCount: (snapshot.patterns || []).length,
        fromCache,
      })
    }

    return adminJson(400, { error: 'Unknown action', allowed: ['stores', 'list', 'get', 'delete', 'rebuild'] })
  } catch (error) {
    console.error('admin-blobs:', error)
    return adminJson(error?.statusCode || 500, {
      error: error?.message || 'Admin request failed',
    })
  }
}
