// src/composables/useGridEngine.js
import { ref } from 'vue'

export function useGridEngine (gridSize = 10) {
  const tiles = ref(Array(gridSize * gridSize).fill([]))
  const hintCounts = ref(
    Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))
  )

  function applyHint (x, y, hintClass) {
    ;[
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ].forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
      const idx = ny * gridSize + nx

      // bump count
      hintCounts.value[idx][hintClass] = (hintCounts.value[idx][hintClass] || 0) + 1

      // add class once
      if (!tiles.value[idx].includes(hintClass)) {
        tiles.value[idx] = [...tiles.value[idx], hintClass]
      }
    })
  }

  function removeHint (x, y, hintClass) {
    ;[
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
        tiles.value[idx] = tiles.value[idx].filter(c => c !== hintClass)
      } else {
        hintCounts.value[idx][hintClass] = cnt - 1
      }
    })
  }

  function updateGridFromData (grid) {
    if (!grid) return

    // clear
    tiles.value = Array(gridSize * gridSize).fill([])
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))

    // lay down API items + neighbor hints
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

  function cycleEngineHint (idx) {
    const apiClasses = ['sand', 'crab', 'treasure']
    const cell = tiles.value[idx]
    if (cell.some(c => apiClasses.includes(c))) return

    const x = idx % gridSize
    const y = Math.floor(idx / gridSize)
    const cycle = ['hint-sand', 'hint-crab', 'hint-treasure', 'hint-nothing', 'hint-unset-white', '']
    const curr = cycle.find(h => cell.includes(h)) || ''
    const next = cycle[(cycle.indexOf(curr) + 1) % cycle.length]

    // remove old neighbor hint if needed
    if (curr === 'hint-sand') removeHint(x, y, 'near-hint-sand')
    if (curr === 'hint-crab') removeHint(x, y, 'near-hint-crab')

    // strip old hint classes
    const clean = cell.filter(c => !cycle.includes(c))
    tiles.value[idx] = next ? [...clean, next] : clean

    // add new neighbor hint if needed
    if (next === 'hint-sand') applyHint(x, y, 'near-hint-sand')
    if (next === 'hint-crab') applyHint(x, y, 'near-hint-crab')

    tiles.value = [...tiles.value]
  }

  function clearEngineHints () {
    tiles.value = tiles.value.map(cell =>
      cell.filter(c => !c.startsWith('hint-') && !c.startsWith('near-hint-'))
    )
    tiles.value = [...tiles.value]
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null)
      .map(() => ({}))
  }

  return {
    tiles,
    updateGridFromData,
    cycleEngineHint,
    clearEngineHints
  }
}
