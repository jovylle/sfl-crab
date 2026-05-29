import { buildReplayCellsAtStep } from '@/utils/buildReplayGrid.js'
import { getPrimaryDigItem, itemNameToSlug, worldAssetPath } from '@/utils/worldAssets.js'

/** @typedef {import('./buildDigTimeline.js').DigStep} DigStep */

/**
 * Custom marks visible after all digs complete.
 * @param {Array<{ type: string, cell: number, classes?: string[], afterDigOrder: number, seq: number }>} markEvents
 * @param {number} digCount
 */
export function marksAtFinalStep (markEvents, digCount) {
  const active = {}
  const sorted = [...(markEvents || [])].sort((a, b) => a.seq - b.seq)

  for (const e of sorted) {
    if (e.afterDigOrder > digCount) continue
    if (e.type === 'set') {
      active[e.cell] = e.classes
    } else if (e.type === 'clear') {
      delete active[e.cell]
    }
  }

  return active
}

/**
 * 1D tile index → 1-based dig order from saved dig-day steps.
 * @param {DigStep[]} digs
 * @param {number} [gridSize]
 */
export function buildTreasureOrderMapFromDigs (digs, gridSize = 10) {
  const total = gridSize * gridSize
  const map = Array.from({ length: total }, () => null)

  for (const step of digs || []) {
    for (const { x, y } of step.tiles || []) {
      const idx = y * gridSize + x
      if (idx >= 0 && idx < total) {
        map[idx] = step.order
      }
    }
  }

  return map
}

/**
 * Per-cell revealed item for public grid labels/icons.
 * @param {DigStep[]} digs
 * @param {number} [gridSize]
 */
export function buildCellItemsFromDigs (digs, gridSize = 10) {
  const total = gridSize * gridSize
  const items = Array.from({ length: total }, () => null)

  for (const step of digs || []) {
    for (const tile of step.tiles || []) {
      const idx = tile.y * gridSize + tile.x
      if (idx < 0 || idx >= total) continue
      const name = getPrimaryDigItem(tile.items)
      const slug = itemNameToSlug(name)
      items[idx] = {
        name,
        slug,
        imagePath: worldAssetPath(slug),
      }
    }
  }

  return items
}

/**
 * Final grid state for a public dig day (not step-by-step replay).
 * @param {DigStep[]} digs
 * @param {Array} [markEvents]
 * @param {number} [gridSize]
 */
export function buildPublicDigView (digs, markEvents, gridSize = 10) {
  const steps = digs || []
  const digCount = steps.length
  const marks = marksAtFinalStep(markEvents, digCount)
  const cells = buildReplayCellsAtStep(steps, digCount, marks, gridSize)
  const treasureOrderMap = buildTreasureOrderMapFromDigs(steps, gridSize)
  const cellItems = buildCellItemsFromDigs(steps, gridSize)

  return {
    cells,
    treasureOrderMap,
    cellItems,
    digCount,
  }
}
