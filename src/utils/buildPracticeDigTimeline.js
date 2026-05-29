/** @typedef {import('./buildDigTimeline.js').DigStep} DigStep */

/**
 * Convert practice engine dig history into a DigStep[] timeline.
 * Each entry maps to one tile dig with items inferred from the hidden grid.
 *
 * @param {Array<{ index: number, at: number }>} digHistory
 * @param {Array<{ type: 'sand'|'treasure'|'crab', name?: string }>} hiddenGrid
 * @param {number} [gridSize]
 * @returns {DigStep[]}
 */
export function buildPracticeDigTimeline (digHistory, hiddenGrid, gridSize = 10) {
  return digHistory.map(({ index, at }, i) => {
    const x = index % gridSize
    const y = Math.floor(index / gridSize)
    const cell = hiddenGrid[index]

    let items = {}
    if (cell?.type === 'treasure') {
      items = { [cell.name]: 1 }
    } else if (cell?.type === 'crab') {
      items = { Crab: 1 }
    } else {
      items = { Sand: 1 }
    }

    return {
      order: i + 1,
      dugAt: at,
      tiles: [{ x, y, items, tool: 'Shovel' }],
    }
  })
}
