// src/composables/useGridManager.js
import { useGridEngine } from './useGridEngine'
import { useHintsStorage } from './useHintsStorage'

const cache = {}

export function useGridManager (rawLandId, gridSize = 10) {
  // 1️⃣ fall back to "0" if no landId provided
  const landKey = rawLandId || '0'

  if (!cache[landKey]) {
    // 2️⃣ core engine + storage
    const engine = useGridEngine(gridSize)
    const storage = useHintsStorage(landKey)

    // 3️⃣ reapply without duplicating engine logic
    function applySavedHints () {
      engine.clearEngineHints()

      for (const [i, classes] of Object.entries(storage.hints.value)) {
        const idx = Number(i)
        engine.tiles.value[idx] = [
          ...engine.tiles.value[idx],
          ...classes
        ]

        // neighbor markers
        classes.forEach(h => {
          const nearCls = `near-${h}`
          const x = idx % gridSize
          const y = Math.floor(idx / gridSize)
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const nx = x + dx, ny = y + dy
            if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue
            const ni = ny * gridSize + nx
            if (!engine.tiles.value[ni].includes(nearCls)) {
              engine.tiles.value[ni] = [
                ...engine.tiles.value[ni],
                nearCls
              ]
            }
          }
        })
      }

      engine.tiles.value = [...engine.tiles.value]
    }

    // 4️⃣ initial overlay on the empty grid
    applySavedHints()

    // 5️⃣ wrap API updates
    function update (apiGrid) {
      engine.updateGridFromData(apiGrid)
      storage.load()
      applySavedHints()
    }

    // 6️⃣ user clicks
    function cycle (idx) {
      engine.cycleEngineHint(idx)
      const hints = engine.tiles.value[idx].filter(c => c.startsWith('hint-'))
      storage.toggle(idx, hints)
      applySavedHints()
    }

    // 7️⃣ clear
    function clear () {
      engine.clearEngineHints()
      storage.clear()
    }

    cache[landKey] = {
      tiles: engine.tiles,
      update,
      cycle,
      clear
    }
  }

  return cache[landKey]
}
