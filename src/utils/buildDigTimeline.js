/** @typedef {{ x: number, y: number, items?: Record<string, number>, tool?: string, dugAt?: number }} DigTile */
/** @typedef {{ order: number, dugAt: number, tiles: DigTile[] }} DigStep */

export function getTodayUTC () {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Group raw digging.grid entries by dugAt (Sand Drill = one step).
 * @param {unknown[]} rawGrid
 * @returns {{ dugAt: number, tiles: DigTile[] }[]}
 */
export function groupDigEntries (rawGrid) {
  if (!Array.isArray(rawGrid)) return []

  return rawGrid.map((entry) => {
    if (Array.isArray(entry)) {
      return { dugAt: entry[0]?.dugAt || 0, tiles: entry }
    }
    return { dugAt: entry.dugAt || 0, tiles: [entry] }
  })
}

/**
 * Ordered dig steps for replay and mark timing.
 * @param {unknown[]} rawGrid
 * @returns {DigStep[]}
 */
export function buildDigTimeline (rawGrid) {
  const entries = groupDigEntries(rawGrid)
  entries.sort((a, b) => a.dugAt - b.dugAt)

  return entries.map((entry, index) => ({
    order: index + 1,
    dugAt: entry.dugAt,
    tiles: entry.tiles.map((t) => ({
      x: t.x,
      y: t.y,
      items: t.items ? { ...t.items } : {},
      tool: t.tool,
    })),
  }))
}

/**
 * Number of completed dig groups (for mark journal afterDigOrder).
 * @param {unknown[]} rawGrid
 */
export function getCurrentDigOrder (rawGrid) {
  return buildDigTimeline(rawGrid).length
}

/**
 * 1D tile index → 1-based dig order (for order badges).
 * @param {unknown[]} rawGrid
 * @param {number} gridSize
 */
export function buildTreasureOrderMap (rawGrid, gridSize = 10) {
  const total = gridSize * gridSize
  const map = Array.from({ length: total }, () => null)
  const steps = buildDigTimeline(rawGrid)

  for (const step of steps) {
    for (const { x, y } of step.tiles) {
      const idx = y * gridSize + x
      if (idx >= 0 && idx < total) {
        map[idx] = step.order
      }
    }
  }

  return map
}

/**
 * Minimal stats for dig-day snapshot.
 * @param {DigStep[]} digs
 */
export function buildDigStats (digs) {
  let treasureCount = 0

  for (const step of digs) {
    for (const tile of step.tiles) {
      if (!tile.items) continue
      for (const [name, count] of Object.entries(tile.items)) {
        if (name !== 'Crab' && name !== 'Sand') {
          treasureCount += Number(count) || 0
        }
      }
    }
  }

  return {
    totalDigs: digs.length,
    treasureCount,
  }
}
