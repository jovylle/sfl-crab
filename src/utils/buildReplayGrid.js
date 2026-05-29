import { useGridEngine } from '@/composables/useGridEngine.js'

/**
 * Grid cell classes at replay step k: digs 1..k plus marks with afterDigOrder <= k.
 * @param {import('./buildDigTimeline.js').DigStep[]} digs
 * @param {number} stepOrder
 * @param {Record<number, string[]>} marksByCell
 * @param {number} [gridSize]
 */
export function buildReplayCellsAtStep (digs, stepOrder, marksByCell, gridSize = 10) {
  const engine = useGridEngine(gridSize)
  const flat = []

  for (const step of digs) {
    if (step.order > stepOrder) break
    for (const tile of step.tiles) {
      flat.push({
        x: tile.x,
        y: tile.y,
        items: tile.items ? { ...tile.items } : {},
      })
    }
  }

  engine.updateGridFromData(flat)

  for (const [idxStr, classes] of Object.entries(marksByCell || {})) {
    const idx = Number(idxStr)
    if (!Number.isFinite(idx)) continue
    const list = Array.isArray(classes) ? classes : [classes]
    for (const cls of list) {
      if (cls) engine.pickEngineHint(idx, cls)
    }
  }

  return engine.tiles.value.map((cell) => [...cell])
}
