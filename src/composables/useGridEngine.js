// src/composables/useGridEngine.js
import { ref } from 'vue'

export function useGridEngine (gridSize = 10) {
  // 1) Initialize each cell with its own empty array
  const tiles = ref(Array.from({ length: gridSize * gridSize }, () => []))

  // 2) Same for hintCounts
  const hintCounts = ref(
    Array.from({ length: gridSize * gridSize }, () => ({}))
  )

  // Apply neighbor hints
  function applyHint (x, y, hintClass) {
    [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ].forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
      const idx = ny * gridSize + nx

      hintCounts.value[idx][hintClass] = (hintCounts.value[idx][hintClass] || 0) + 1
      if (!tiles.value[idx].includes(hintClass)) {
        tiles.value[idx] = [...tiles.value[idx], hintClass]
      }
    })
  }

  // Remove neighbor hints
  function removeHint (x, y, hintClass) {
    [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ].forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
      const idx = ny * gridSize + nx

      const cnt = hintCounts.value[idx][hintClass] || 0
      if (cnt <= 1) {
        delete hintCounts.value[idx][hintClass]
        tiles.value[idx] = tiles.value[idx].filter(
          c => typeof c === 'string' && c !== hintClass
        )
      } else {
        hintCounts.value[idx][hintClass] = cnt - 1
      }
    })
  }

  // Load / reset from API data
  function updateGridFromData (grid) {
    if (!grid) return

    // reset all cells
    tiles.value = Array.from({ length: gridSize * gridSize }, () => [])
    hintCounts.value = Array.from({ length: gridSize * gridSize }, () => ({}))

    grid.forEach(tile => {
      const idx = tile.y * gridSize + tile.x
      const itemName = Object.keys(tile.items || {})[0]
      const slug = itemName
        ? itemName.toLowerCase().replace(/\s+/g, '_')
        : 'unknown'
      const tileImageClass = `tileImage:${slug}`

      if (tile.items?.Crab) {
        tiles.value[idx] = ['crab', tileImageClass]
        applyHint(tile.x, tile.y, 'near-crab')
      } else if (tile.items?.Sand) {
        tiles.value[idx] = ['sand', tileImageClass]
        applyHint(tile.x, tile.y, 'near-sand')
      } else {
        tiles.value[idx] = ['treasure', tileImageClass]
      }
    })

    // trigger reactivity
    tiles.value = [...tiles.value]
  }

  // Order for fallback cycling
  const cycleOrder = [
    'hint-sand',
    'hint-crab',
    'hint-treasure',
    'hint-nothing',
    'hint-unset-white',
    ''
  ]

  // // Fallback cycle through hints
  // function cycleEngineHint (idx) {
  //   const apiClasses = ['sand', 'crab', 'treasure']
  //   const cell = tiles.value[idx]
  //   if (cell.some(c => apiClasses.includes(c))) return

  //   const x = idx % gridSize
  //   const y = Math.floor(idx / gridSize)
  //   const curr = cycleOrder.find(h => cell.includes(h)) || ''
  //   const next = cycleOrder[(cycleOrder.indexOf(curr) + 1) % cycleOrder.length]

  //   if (curr === 'hint-sand') removeHint(x, y, 'near-hint-sand')
  //   if (curr === 'hint-crab') removeHint(x, y, 'near-hint-crab')

  //   const clean = cell.filter(c => typeof c === 'string' && !cycleOrder.includes(c))
  //   tiles.value[idx] = next ? [...clean, next] : clean

  //   if (next === 'hint-sand') applyHint(x, y, 'near-hint-sand')
  //   if (next === 'hint-crab') applyHint(x, y, 'near-hint-crab')

  //   tiles.value = [...tiles.value]
  // }

  // Apply one specific picked hint
  function pickEngineHint (idx, hintClass) {
    const x = idx % gridSize
    const y = Math.floor(idx / gridSize)
    const cell = tiles.value[idx]

    // strip out old hints & neighbor hints
    const clean = cell.filter(
      c => typeof c === 'string' &&
        !c.startsWith('hint-') &&
        !c.startsWith('near-hint-')
    )

    // remove neighbor hints from any old hint
    cycleOrder.forEach(old => {
      if (old && clean.includes(old)) {
        if (old === 'hint-sand') removeHint(x, y, 'near-hint-sand')
        if (old === 'hint-crab') removeHint(x, y, 'near-hint-crab')
      }
    })

    // apply the chosen hint
    tiles.value[idx] = hintClass ? [...clean, hintClass] : clean

    // apply neighbor hints for the new hint
    if (hintClass === 'hint-sand'){
      applyHint(x, y, 'near-hint-sand')
    }else{
      removeHint(x, y, 'near-hint-sand')
    }
    if (hintClass === 'hint-crab'){
      applyHint(x, y, 'near-hint-crab')
    }else{
      removeHint(x, y, 'near-hint-crab')
    }

    tiles.value = [...tiles.value]
  }

  // Clear all hints
  function clearEngineHints () {
    tiles.value = tiles.value.map(cell =>
      cell.filter(
        c => typeof c === 'string' &&
          !c.startsWith('hint-') &&
          !c.startsWith('near-hint-')
      )
    )
    tiles.value = [...tiles.value]
    hintCounts.value = Array.from({ length: gridSize * gridSize }, () => ({}))
  }

  return {
    tiles,
    updateGridFromData,
    // cycleEngineHint, removed any cycle
    pickEngineHint,
    clearEngineHints
  }
}
