import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'

export const PATTERN_GRID_SIZE = 4

export function patternLabel (key) {
  return String(key)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function getFormationBounds (formation) {
  if (!formation?.length) {
    return { minX: 0, minY: 0, width: 0, height: 0 }
  }

  const xs = formation.map((plot) => plot.x)
  const ys = formation.map((plot) => plot.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export function getPreviewOffset (formation) {
  const { minX, minY, width, height } = getFormationBounds(formation)

  return {
    x: Math.floor((PATTERN_GRID_SIZE - width) / 2) - minX,
    y: Math.floor((PATTERN_GRID_SIZE - height) / 2) - minY,
  }
}

export function getPlotAt (key, cellIndex) {
  const formation = DIGGING_FORMATIONS[key] || []
  const idx = cellIndex - 1
  const col = idx % PATTERN_GRID_SIZE
  const row = Math.floor(idx / PATTERN_GRID_SIZE)
  const offset = getPreviewOffset(formation)
  const x = col - offset.x
  const y = row - offset.y

  return formation.find((plot) => plot.x === x && plot.y === y) || null
}

export function getPatternImageUrl (name) {
  return `/world/${String(name).toLowerCase().replace(/\s+/g, '_')}.webp`
}

/**
 * Map completedPatterns (server) to thumb indexes (left-to-right), even if keys repeat.
 * @param {string[]} patternKeys
 * @param {string[]} completedPatternKeys
 * @returns {Set<number>}
 */
export function buildServerCompletedIndexes (patternKeys, completedPatternKeys) {
  const remaining = new Map()
  for (const key of completedPatternKeys || []) {
    remaining.set(key, (remaining.get(key) ?? 0) + 1)
  }

  const indexes = new Set()
  ;(patternKeys || []).forEach((key, index) => {
    const left = remaining.get(key) ?? 0
    if (left > 0) {
      indexes.add(index)
      remaining.set(key, left - 1)
    }
  })
  return indexes
}
