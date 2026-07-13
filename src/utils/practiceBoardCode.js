/**
 * Compact, backend-free encoding of a practice board for shareable `?board=` links.
 *
 * A board is fully determined by each formation's key + origin offset (formation
 * shapes are fixed in DIGGING_FORMATIONS), so we store only [key, ox, oy] per
 * placement and rebuild absolute tiles on decode. Duplicate formations are fine
 * (the same key appears multiple times with different origins).
 */
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

function base64UrlEncode (str) {
  // UTF-8 safe: percent-encode then map bytes into btoa.
  const b64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
  )
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode (code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return decodeURIComponent(
    Array.from(bin, c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
  )
}

/**
 * @param {Array<{ key: string, tiles: Array<{x:number,y:number}> }>} placements
 * @returns {string} base64url-encoded board code
 */
export function encodeBoard (placements) {
  const compact = (placements || []).map(({ key, tiles }) => {
    const formation = DIGGING_FORMATIONS[key]
    if (!formation?.length || !tiles?.length) return null
    const ox = tiles[0].x - formation[0].x
    const oy = tiles[0].y - formation[0].y
    return [key, ox, oy]
  }).filter(Boolean)
  return base64UrlEncode(JSON.stringify(compact))
}

/**
 * @param {string} code base64url-encoded board code
 * @returns {Array<{ key: string, tiles: Array<{x:number,y:number}> }>|null}
 *   placements ready for startGameFromPlacements, or null if invalid.
 */
export function decodeBoard (code) {
  try {
    const compact = JSON.parse(base64UrlDecode(String(code || '')))
    if (!Array.isArray(compact) || !compact.length) return null
    const placements = compact.map(entry => {
      const [key, ox, oy] = entry || []
      const formation = DIGGING_FORMATIONS[key]
      if (!formation?.length || !Number.isFinite(ox) || !Number.isFinite(oy)) {
        throw new Error('invalid board entry')
      }
      return { key, tiles: formation.map(p => ({ x: ox + p.x, y: oy + p.y })) }
    })
    return placements
  } catch {
    return null
  }
}
