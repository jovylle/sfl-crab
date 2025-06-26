// src/composables/useGridEngine.js
import { ref } from 'vue'

export function useGridEngine (gridSize = 10) {
  // 1) Initialize each cell with its own empty array
  const tiles = ref(Array.from({ length: gridSize * gridSize }, () => []))

  // 2) Same for hintCounts
  const hintCounts = ref(
    Array.from({ length: gridSize * gridSize }, () => ({}))
  )

  function applyHint (x, y, hintClass) {
    const deltas = [
      { dx: 0, dy: -1 }, // above
      { dx: 1, dy: 0 }, // right
      { dx: 0, dy: 1 }, // below
      { dx: -1, dy: 0 }  // left
    ]

    // ─── Special case: cancel all near-crab hints if any neighbour has a treasure ───
    if (hintClass === 'near-crab' || hintClass === 'near-hint-crab') {
      const foundTreasure = deltas.some(({ dx, dy }) => {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return false
        const idx = ny * gridSize + nx
        
        return tiles.value[idx].some(c =>
        {
          // console.log('Checking classes kids:', c, 'Type:', typeof c);
          // console.log('treasure check:', c === 'treasure' || c === 'hint-treasure');
          return c.includes('hint-treasure') || c.includes('treasure');
        }
        )
      })
      if (foundTreasure) return  // if any neighbor has a treasure, skip applying this hint
    }
  
    // ─── Otherwise, apply the hint as usual ───
    deltas.forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
      const idx = ny * gridSize + nx

      // increment the count for this hint
      hintCounts.value[idx][hintClass] = (hintCounts.value[idx][hintClass] || 0) + 1
      // add the CSS class if it’s not already present
      if (!tiles.value[idx].includes(hintClass)) {
        tiles.value[idx] = [...tiles.value[idx], hintClass]
      }
    })
  

  }

  // New helper to clear existing near-crab hints
  function clearNearHints () {
    tiles.value = tiles.value.map(classes =>
      classes.filter(c => c !== 'near-crab' && c !== 'near-hint-crab' && c !== 'near-sand' && c !== 'near-hint-sand')
    )
    hintCounts.value = hintCounts.value.map(() => ({}))
  }

  // The “rebuild” function
  function rebuildNearHints () {
    clearNearHints()
    // console.log('Rebuilding Near Crab/Sand hints...')

    // walk every tile
    tiles.value.forEach((classes, idx) => {
      const x = idx % gridSize
      const y = Math.floor(idx / gridSize)

      // if it’s a real crab, apply the standard near-crab
      if (classes.includes('crab')) {
        applyHint(x, y, 'near-crab')
      }
      // if it’s a manually-picked crab hint, apply near-hint-crab
      if (classes.includes('hint-crab tileImage:crab')) {
        applyHint(x, y, 'near-hint-crab')
      }
      // if it’s a real sand, apply the standard near-sand
      if (classes.includes('sand')) {
        applyHint(x, y, 'near-sand')
      }
      // if it’s a manually-picked sand hint, apply near-hint-sand
      if (classes.includes('hint-sand tileImage:sand')) {
        applyHint(x, y, 'near-hint-sand')
      }
    })
  }
  

  // // Remove neighbor hints
  // function removeHint (x, y, hintClass) {
  //   [
  //     { dx: 0, dy: -1 },
  //     { dx: 1, dy: 0 },
  //     { dx: 0, dy: 1 },
  //     { dx: -1, dy: 0 }
  //   ].forEach(({ dx, dy }) => {
  //     const nx = x + dx
  //     const ny = y + dy
  //     if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
  //     const idx = ny * gridSize + nx

  //     const cnt = hintCounts.value[idx][hintClass] || 0
  //     if (cnt <= 1) {
  //       delete hintCounts.value[idx][hintClass]
  //       tiles.value[idx] = tiles.value[idx].filter(
  //         c => typeof c === 'string' && c !== hintClass
  //       )
  //     } else {
  //       hintCounts.value[idx][hintClass] = cnt - 1
  //     }
  //   })
  // }

  // Load / reset from API data
  // Load / reset from API data
  function updateGridFromData (grid) {
    if (!grid) return

    // 1️⃣ Reset all cells & counts
    tiles.value = Array.from({ length: gridSize * gridSize }, () => [])
    hintCounts.value = Array.from({ length: gridSize * gridSize }, () => ({}))

    // 2️⃣ First pass: assign the base item classes
    grid.forEach(tile => {
      const idx = tile.y * gridSize + tile.x
      const itemName = Object.keys(tile.items || {})[0]
      const slug = itemName
        ? itemName.toLowerCase().replace(/\s+/g, '_')
        : 'unknown'
      const tileImageClass = `tileImage:${slug}`

      if (tile.items?.Crab) {
        tiles.value[idx] = ['crab', tileImageClass]
      } else if (tile.items?.Sand) {
        tiles.value[idx] = ['sand', tileImageClass]
      } else {
        tiles.value[idx] = ['treasure', tileImageClass]
      }
    })

    // 4️⃣ Trigger reactivity
    tiles.value = [...tiles.value]
    rebuildNearHints()
  }


  // // Order for fallback cycling
  // const cycleOrder = [
  //   'hint-sand',
  //   'hint-crab',
  //   'hint-treasure',
  //   'hint-nothing',
  //   'hint-unset-white',
  //   ''
  // ]

  // Apply one specific picked hint
  function pickEngineHint (idx, hintClass) {
    const x = idx % gridSize
    const y = Math.floor(idx / gridSize)
    const cell = tiles.value[idx]

    // strip out old hints & neighbor hints
    const clean = cell.filter(
      c => typeof c === 'string' &&
        !c.startsWith('hint-')
    )

    // apply the chosen hint
    tiles.value[idx] = hintClass ? [...clean, hintClass] : clean
    tiles.value = [...tiles.value]
    rebuildNearHints()
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
    pickEngineHint,
    clearEngineHints,
    rebuildNearHints
  }
}
