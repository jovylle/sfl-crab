// gridTileTransform.js — pure raw-grid → tile-classes transform.
//
// Extracted from useGridEngine.updateGridFromData so the same mapping can run
// outside Vue (e.g. scripts/debug-solver.js) with zero drift from the app.

/**
 * @param {{x:number,y:number,items?:Record<string,number>}[]} grid
 * @param {number} gridSize - default 10
 * @returns {string[][]} tiles indexed by y * gridSize + x
 */
export function gridArrayToTiles (grid, gridSize = 10) {
  const tiles = Array.from({ length: gridSize * gridSize }, () => [])
  if (!grid) return tiles

  grid.forEach(tile => {
    const idx = tile.y * gridSize + tile.x
    const itemName = Object.keys(tile.items || {})[0]
    const slug = itemName
      ? itemName.toLowerCase().replace(/\s+/g, '_')
      : 'unknown'
    const tileImageClass = `tileImage:${slug}`

    if (tile.items?.Crab) {
      tiles[idx] = ['crab', tileImageClass]
    } else if (tile.items?.Sand) {
      tiles[idx] = ['sand', tileImageClass]
    } else {
      tiles[idx] = ['treasure actual-treasure', tileImageClass]
    }
  })

  return tiles
}
