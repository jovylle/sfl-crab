const DEFAULT_HUB_UI =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_HUB_UI_BASE
    ? import.meta.env.VITE_HUB_UI_BASE
    : 'https://beta.hub.d1g.uk'

/**
 * Hub replay link from dig-day API (replayUrl or replayId/id + UI base).
 * @param {object | null | undefined} data
 * @returns {string | null}
 */
export function resolveHubReplayUrl (data) {
  if (!data || typeof data !== 'object') return null

  const direct = data.replayUrl
  if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) {
    return direct
  }

  const id = data.replayId ?? data.id
  if (id == null || id === '') return null

  const base = String(DEFAULT_HUB_UI).replace(/\/$/, '')
  return `${base}/replay/${encodeURIComponent(String(id))}`
}
