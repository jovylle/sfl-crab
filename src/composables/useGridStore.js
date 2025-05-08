// inside src/composables/useGridStore.js

import { ref } from 'vue'

import { useCustomHints } from './useCustomHints'


const tiles = ref([])
const hintCounts = ref([])

/**
 * Singleton store for grid + manual‐hint state, keyed by landId.
 * @param {string} landId
 * @param {number} gridSize
 */
export function useGridStore (landId, gridSize = 10) {

  // const { clearCustomHints: clearPersistedHints } = useCustomHints(landId)

  // 1) Bring in your custom-hints API
  const {
    hints,
    loadCustomHints,
    toggleHintAt,
    clearCustomHints: clearPersistedHints
  } = useCustomHints(landId)

  // initialize once per app/tab
  if (!tiles.value.length) {
    tiles.value = Array(gridSize * gridSize).fill([])
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))
  }

  /**
   * Rebuilds tiles & neighbor‐hint counts from a server‐driven grid array
   * grid: Array<{ x:number, y:number, items: Record<string, any> }>
   */
  function updateGridFromData (grid) {
    // reset
    tiles.value = Array(gridSize * gridSize).fill([])
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))

    // lay down base classes + neighbor hints
    grid.forEach(tile => {
      const idx = tile.y * gridSize + tile.x
      const key = Object.keys(tile.items || {})[0] || 'unknown'
      const slug = key.toLowerCase().replace(/\s+/g, '_')
      const base = key.toLowerCase().replace(/\s+/g, '_')
      tiles.value[idx] = [base, 'treasure ', `tileImage:${slug}`]

      // apply neighbor hint for Crab / Sand
      const hintCls = key === 'Crab'
        ? 'near-crab'
        : key === 'Sand'
          ? 'near-sand'
          : null

      if (hintCls) applyNeighborHint(tile.x, tile.y, hintCls)
    })



    loadCustomHints()
    Object.entries(hints.value).forEach(([i, classes]) => {
      const idx = Number(i)
      // overlay user hints
      tiles.value[idx] = [...tiles.value[idx], ...classes]
      // overlay neighbor hints for each
      classes.forEach(h => {
        const [x, y] = [idx % gridSize, Math.floor(idx / gridSize)]
        const near = `near-${h}`
          ;[[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
            const ni = ny * gridSize + nx
            if (!tiles.value[ni].includes(near)) {
              tiles.value[ni] = [...tiles.value[ni], near]
            }
          })
      })
    })
    // trigger reactivity
    tiles.value = [...tiles.value]
    // console.log('⚙️ updateGridFromData() ran — first row:', tiles.value.slice(0, 30));
  }

  /** Cycles through user‐placed hints on a cell and updates neighbor hints */
  function cycleHintAt (idx) {
    const apiTiles = ['sand', 'crab', 'treasure']
    if (tiles.value[idx].some(c => apiTiles.includes(c))) return

    const x = idx % gridSize
    const y = Math.floor(idx / gridSize)
    const cycle = ['hint-sand', 'hint-crab', 'hint-treasure', '']
    const curr = cycle.find(h => tiles.value[idx].includes(h)) || ''
    const next = cycle[(cycle.indexOf(curr) + 1) % cycle.length]

    // remove old neighbor hints
    if (curr) applyNeighborHint(x, y, `near-${curr}`)
    // strip old hint classes
    tiles.value[idx] = tiles.value[idx].filter(c => !cycle.includes(c))
    // add new hint + its neighbor hints
    if (next) {
      tiles.value[idx] = [...tiles.value[idx], next]
      applyNeighborHint(x, y, `near-${next}`)
    }

    tiles.value = [...tiles.value]
  }

  /** Clears all user‐placed hints, leaving only server tiles + neighbors */
  function clearCustomHints () {
    // 1) clear in-memory hints
    tiles.value = tiles.value.map(cell =>
      cell.filter(c => !c.startsWith('hint-') && !c.startsWith('near-hint-'))
    )
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))
    tiles.value = [...tiles.value]

    // 2) clear persisted hints
    clearPersistedHints()
  }

  /** Helper: bump/remove neighbor hints in four directions */
  function applyNeighborHint (x, y, hintClass) {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    dirs.forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
      const i = ny * gridSize + nx
      // bump count
      hintCounts.value[i][hintClass] = (hintCounts.value[i][hintClass] || 0) + 1
      // add class once
      if (!tiles.value[i].includes(hintClass)) {
        tiles.value[i] = [...tiles.value[i], hintClass]
      }
    })
  }

  return {
    tiles,
    updateGridFromData,
    cycleHintAt,
    clearCustomHints
  }
}
