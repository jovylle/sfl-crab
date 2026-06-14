import { hubAuthHeaders } from '@/features/hub/hubClient.js'
import {
  getFreshDigDayCache,
  writeDigDayCache,
  readDigDayCache,
  clearDigDayCache,
} from '@/utils/digDayCache.js'

const API_BASE = '/api/dig-day'

export class DigDayApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number }} [options]
   */
  constructor (message, { status } = {}) {
    super(message)
    this.name = 'DigDayApiError'
    this.status = status
  }
}

/**
 * @param {string} landId
 * @param {string} utcDate
 * @param {{ force?: boolean }} [options]
 */
export async function fetchDigDay (landId, utcDate, { force = false } = {}) {
  const id = String(landId)
  const date = String(utcDate)

  if (!force) {
    const fresh = getFreshDigDayCache(id, date)
    if (fresh) {
      return fresh.body
    }
  }

  const headers = hubAuthHeaders()
  const cached = readDigDayCache(id, date)
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag
  }

  const params = new URLSearchParams({ landId: id, utcDate: date })
  const res = await fetch(`${API_BASE}?${params}`, {
    method: 'GET',
    headers,
  })

  if (res.status === 304) {
    const entry = readDigDayCache(id, date)
    if (entry?.body !== undefined) {
      writeDigDayCache(id, date, {
        body: entry.body,
        etag: entry.etag || cached?.etag || res.headers.get('etag'),
        fetchedAt: Date.now(),
      })
      return entry.body
    }
  }

  const data = await res.json().catch(() => null)

  if (res.status === 404) {
    writeDigDayCache(id, date, {
      body: data,
      etag: res.headers.get('etag'),
      fetchedAt: Date.now(),
    })
    return data
  }

  if (!res.ok) {
    throw new Error(data?.error || `Failed to load dig day (${res.status})`)
  }

  writeDigDayCache(id, date, {
    body: data,
    etag: res.headers.get('etag'),
    fetchedAt: Date.now(),
  })

  return data
}

/**
 * @param {object} payload
 */
export async function saveDigDay (payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: hubAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message =
      err.error ||
      (res.status === 413
        ? 'Dig day is too large to save (256 KB limit). Try clearing marks or extra history.'
        : `Failed to save dig day (${res.status})`)
    throw new DigDayApiError(message, { status: res.status })
  }

  const saved = await res.json()
  const landId = String(payload?.landId || '')
  const utcDate = String(payload?.utcDate || '')
  if (landId && utcDate) {
    writeDigDayCache(landId, utcDate, {
      body: saved,
      etag: res.headers.get('etag'),
      fetchedAt: Date.now(),
    })
  }
  return saved
}

/**
 * @param {string} landId
 * @param {string} utcDate
 */
export function invalidateDigDayCache (landId, utcDate) {
  clearDigDayCache(String(landId), String(utcDate))
}
