// src/composables/useGrid.js
import { ref } from 'vue'
import { triggerSoftReload } from './useSoftReload'  // ← import this

export function useGrid (landId, gridSize = 10) {

  const STORAGE_KEY = `gridCustomHints_${landId}`

  // the tile classes array
  const tiles = ref(Array(gridSize * gridSize).fill([]))

  // track neighbor hint counts so we know when to remove them
  const hintCounts = ref(
    Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))
  )

  // ─── apply / remove neighbor hints ────────────────────────────────────────
  function applyHint (x, y, hintClass) {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ]
    dirs.forEach(({ dx, dy }) => {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return

      const idx = ny * gridSize + nx
      // bump the count
      hintCounts.value[idx][hintClass] = (hintCounts.value[idx][hintClass] || 0) + 1

      // if not already present, add it
      if (!tiles.value[idx].includes(hintClass)) {
        tiles.value[idx] = [...tiles.value[idx], hintClass]
      }
    })
  }

  function removeHint (x, y, hintClass) {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ]
    dirs.forEach(({ dx, dy }) => {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return

      const idx = ny * gridSize + nx
      const cnt = hintCounts.value[idx][hintClass] || 0
      if (cnt <= 1) {
        // remove entirely
        delete hintCounts.value[idx][hintClass]
        tiles.value[idx] = tiles.value[idx].filter(c => c !== hintClass)
      } else {
        // just decrement
        hintCounts.value[idx][hintClass] = cnt - 1
      }
    })
  }

  // helper to get x,y from index
  function getXY (idx) {
    return { x: idx % gridSize, y: Math.floor(idx / gridSize) }
  }

  // ─── load the API grid, reset everything, then re-apply custom hints ───────
  function updateGridFromData (grid) {
    if (!grid) return console.warn('No grid in data')

    // 1) clear out base tiles & hints
    tiles.value = Array(gridSize * gridSize).fill([])
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))

    // 2) lay down API items + neighbor hints
    grid.forEach(tile => {
      const idx = tile.y * gridSize + tile.x
      if (tile.items?.Crab) {
        tiles.value[idx] = ['crab']
        applyHint(tile.x, tile.y, 'near-crab')
      }
      else if (tile.items?.Sand) {
        tiles.value[idx] = ['sand']
        applyHint(tile.x, tile.y, 'near-sand')
      }
      else {
        tiles.value[idx] = ['treasure']
      }
    })

    // force Vue to see the array change
    tiles.value = [...tiles.value]

    // 3) overlay your saved hints on top
    loadCustomHints()
    
    triggerSoftReload()
    console.log('Grid UI DOM updated from API data')
    // console.log('tiles', tiles.value)
  }

  // ─── cycle user hints & persist ───────────────────────────────────────────
  function cycleHintAt (idx) {
    const apiClasses = ['sand', 'crab', 'treasure']
    const current = tiles.value[idx]
    if (current.some(c => apiClasses.includes(c))) return

    const { x, y } = getXY(idx)
    const cycle = ['hint-sand', 'hint-crab', 'hint-treasure', 'hint-nothing', '']
    const currHint = cycle.find(h => current.includes(h)) || ''
    const nextHint = cycle[(cycle.indexOf(currHint) + 1) % cycle.length]

    // remove old user hint + its neighbor hint
    if (currHint === 'hint-sand') removeHint(x, y, 'near-hint-sand')
    if (currHint === 'hint-crab') removeHint(x, y, 'near-hint-crab')

    // strip out any existing hint- classes
    const clean = current.filter(c => !cycle.includes(c))
    tiles.value[idx] = nextHint ? [...clean, nextHint] : clean

    // add new neighbor hint if needed
    if (nextHint === 'hint-sand') applyHint(x, y, 'near-hint-sand')
    if (nextHint === 'hint-crab') applyHint(x, y, 'near-hint-crab')

    // persist only `hint-…` entries
    saveCustomHints()
  }

  // ─── persist & restore just the `hint-…` bits ─────────────────────────────
  function saveCustomHints () {
    const out = {}
    tiles.value.forEach((classes, i) => {
      const hints = classes.filter(c => c.startsWith('hint-'))
      if (hints.length) out[i] = hints
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out))
  }

  function loadCustomHints () {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const obj = JSON.parse(raw)
      Object.entries(obj).forEach(([i, classes]) => {
        const idx = Number(i)
        tiles.value[idx] = [
          ...tiles.value[idx].filter(c => !c.startsWith('hint-')),
          ...classes
        ]
        // also rebuild neighbor counts for these hints
        const { x, y } = getXY(idx)
        classes.forEach(h => {
          const neighborCls = h.replace('hint-', 'near-hint-')
          applyHint(x, y, neighborCls)
        })
      })
      tiles.value = [...tiles.value]
    } catch {
      console.warn('Bad custom-hints payload')
    }
  }

  function clearCustomHints () {
    // 1) Remove the stored manual hints
    localStorage.removeItem(STORAGE_KEY)

    // 2) Reset neighbor hint counts so no stray near-… classes remain
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))

    // 3) Rebuild the base grid from your landData blob in localStorage
    loadFromLocalStorage()

    // 4) Force a tiles array refresh if needed
    tiles.value = [...tiles.value]
  }



  // ─── initial load from your saved API blob ────────────────────────────────
  function loadFromLocalStorage () {
    const raw = localStorage.getItem('landData')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const grid = data?.state?.desert?.digging?.grid
      if (grid) updateGridFromData(grid)
    } catch (e) {
      console.error('Invalid landData', e)
    }
  }
  // onSoftReload('useGrid.reloadFromStorage', () => {
  //   loadFromLocalStorage()
  // })
  return {
    tiles,
    updateGridFromData,
    loadFromLocalStorage,
    cycleHintAt,
    clearCustomHints,
  }
}
