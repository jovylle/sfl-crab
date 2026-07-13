/**
 * Compact, backend-free encoding of a practice board for shareable `?board=` links.
 *
 * v2 (starts with '2'): 3 chars per formation — formation index + ox + oy.
 *   7 formations → "2" + 21 chars = 22 chars total.
 * legacy: base64url(JSON) — decoded for backward compatibility.
 */
import { DIGGING_FORMATIONS, FORMATION_KEYS } from '@/data/game/diggingFormations.js'

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const COORD  = '0123456789abcdefghijklmn'
const COORD_OFFSET = 4

/**
 * @param {Array<{ key: string, tiles: Array<{x:number,y:number}> }>} placements
 * @returns {string} v2 board code
 */
export function encodeBoard (placements) {
  let code = '2'
  for (const { key, tiles } of (placements || [])) {
    const formation = DIGGING_FORMATIONS[key]
    if (!formation?.length || !tiles?.length) continue
    const ki = FORMATION_KEYS.indexOf(key)
    const ox = tiles[0].x - formation[0].x
    const oy = tiles[0].y - formation[0].y
    code += B64URL[ki] + COORD[ox + COORD_OFFSET] + COORD[oy + COORD_OFFSET]
  }
  return code
}

function decodeBoardV2 (s) {
  try {
    const body = s.slice(1)
    if (!body.length || body.length % 3 !== 0) return null
    const placements = []
    for (let i = 0; i < body.length; i += 3) {
      const ki  = B64URL.indexOf(body[i])
      const oxi = COORD.indexOf(body[i + 1])
      const oyi = COORD.indexOf(body[i + 2])
      if (ki < 0 || oxi < 0 || oyi < 0) return null
      const key = FORMATION_KEYS[ki]
      const formation = DIGGING_FORMATIONS[key]
      if (!formation?.length) return null
      const ox = oxi - COORD_OFFSET
      const oy = oyi - COORD_OFFSET
      placements.push({ key, tiles: formation.map(p => ({ x: ox + p.x, y: oy + p.y })) })
    }
    return placements.length ? placements : null
  } catch {
    return null
  }
}

function base64UrlDecode (code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return decodeURIComponent(
    Array.from(bin, c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
  )
}

function decodeBoardLegacy (s) {
  try {
    const compact = JSON.parse(base64UrlDecode(s))
    if (!Array.isArray(compact) || !compact.length) return null
    return compact.map(entry => {
      const [key, ox, oy] = entry || []
      const formation = DIGGING_FORMATIONS[key]
      if (!formation?.length || !Number.isFinite(ox) || !Number.isFinite(oy)) {
        throw new Error('invalid board entry')
      }
      return { key, tiles: formation.map(p => ({ x: ox + p.x, y: oy + p.y })) }
    })
  } catch {
    return null
  }
}

/**
 * @param {string} code board code (v2 or legacy base64url)
 * @returns {Array<{ key: string, tiles: Array<{x:number,y:number}> }>|null}
 */
export function decodeBoard (code) {
  const s = String(code || '').trim()
  if (s.startsWith('2')) return decodeBoardV2(s)
  return decodeBoardLegacy(s)
}
