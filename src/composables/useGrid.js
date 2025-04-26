import { ref, watch } from 'vue'

export function useGrid (gridSize = 10) {
  const tiles = ref(Array(gridSize * gridSize).fill([]))

  function updateGridFromData (grid) {
    if (!grid) {
      console.warn('No valid digging.grid found in desertData:', grid)
      return
    }

    tiles.value = Array(gridSize * gridSize).fill([])

    grid.forEach(tile => {
      const index = tile.y * gridSize + tile.x

      if (tile.items?.Crab) {
        tiles.value[index] = ['crab']
        applyHint(tile.x, tile.y, 'near-crab')
      } else if (tile.items?.Sand) {
        tiles.value[index] = ['sand']
        applyHint(tile.x, tile.y, 'near-sand')
      } else {
        tiles.value[index] = ['treasure']
      }
    })
    tiles.value = [...tiles.value]
  }

  // WATCH TILES:
  watch(tiles, (newTiles, oldTiles) => {
    console.log('USEGRID FILE Tiles updated!')
    console.log('New Tiles:', newTiles)
    console.log('Old Tiles:', oldTiles)
  })
  const hintCounts = ref(Array(gridSize * gridSize).fill(null).map(() => ({})))

  function applyHint (x, y, hintClass) {
    const directions = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ]

    directions.forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        const index = ny * gridSize + nx
        const currentTile = tiles.value[index]
        const counts = hintCounts.value[index]

        counts[hintClass] = (counts[hintClass] || 0) + 1

        if (!currentTile.includes(hintClass)) {
          tiles.value[index] = [...currentTile, hintClass]
        }
      }
    })
  }

  function removeHint (x, y, hintClass) {
    const directions = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ]

    directions.forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        const index = ny * gridSize + nx
        const currentTile = tiles.value[index]
        const counts = hintCounts.value[index]

        if (counts[hintClass]) {
          counts[hintClass]--

          if (counts[hintClass] === 0) {
            delete counts[hintClass]
            tiles.value[index] = currentTile.filter(cls => cls !== hintClass)
          }
        }
      }
    })
  }

  function getXY (index) {
    return { x: index % gridSize, y: Math.floor(index / gridSize) }
  }

  function cycleHintAt (index) {
    const apiClasses = ['sand', 'near-sand', 'crab', 'treasure', 'near-hint-sand']
    const current = tiles.value[index]
    if (current.some(cls => apiClasses.includes(cls))) return // ignore non-editable

    const { x, y } = getXY(index)

    const cycle = ['hint-sand', 'hint-crab', 'hint-treasure', '']
    const currentHint = cycle.find(h => current.includes(h))
    const currentIndex = cycle.indexOf(currentHint || '')
    const nextHint = cycle[(currentIndex + 1) % cycle.length]

    // Clear all previous hints
    const cleaned = current.filter(cls => !cycle.includes(cls))
    tiles.value[index] = nextHint ? [...cleaned, nextHint] : cleaned

    // Update neighbors
    if (currentHint === 'hint-sand') removeHint(x, y, 'near-hint-sand')
    if (currentHint === 'hint-crab') removeHint(x, y, 'near-hint-crab')
    if (nextHint === 'hint-sand') applyHint(x, y, 'near-hint-sand')
    if (nextHint === 'hint-crab') applyHint(x, y, 'near-hint-crab')
  }

  function loadFromLocalStorage () {
    const saved = localStorage.getItem('landData')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data?.state?.desert?.digging?.grid) {
          updateGridFromData(data.state.desert.digging.grid)
        } else {
          console.warn('No valid state.desert.digging.grid found in landData:', data)
        }
      } catch (e) {
        console.error('Invalid landData in localStorage', e)
      }
    }
  }



  return {
    tiles,
    updateGridFromData,
    loadFromLocalStorage,
    cycleHintAt
  }
}
