// src/composables/useGridManager.js
import { useGridEngine } from './useGridEngine'
import { useHintsStorage } from './useHintsStorage'

const cache = {}

export function useGridManager (landId, gridSize = 10) {
  if (!landId) {
    throw new Error('landId is required in useGridManager')
  }

  if (!cache[landId]) {
    // 1) grid engine
    const engine = useGridEngine(gridSize)
    // 2) hints persistence
    const storage = useHintsStorage(landId)

    // apply saved hints on top of engine.tiles
    function applySavedHints () {
      // strip old hint- and near-hint- classes
      engine.tiles.value = engine.tiles.value.map(cell =>
        cell.filter(c => !c.startsWith('hint-') && !c.startsWith('near-hint-'))
      )

      // overlay saved hints + neighbor markers
      Object.entries(storage.hints.value).forEach(([i, classes]) => {
        const idx = Number(i)
        // overlay hint
        engine.tiles.value[idx] = [
          ...engine.tiles.value[idx],
          ...classes
        ]
        // overlay neighbors
        classes.forEach(h => {
          const nearCls = `near-${h}`
          const x = idx % gridSize
          const y = Math.floor(idx / gridSize)
            ;[[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
              const nx = x + dx
              const ny = y + dy
              if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return
              const ni = ny * gridSize + nx
              if (!engine.tiles.value[ni].includes(nearCls)) {
                engine.tiles.value[ni] = [
                  ...engine.tiles.value[ni],
                  nearCls
                ]
              }
            })
        })
      })

      engine.tiles.value = [...engine.tiles.value]
    }

    // API-driven update
    function update (apiGrid) {
      engine.updateGridFromData(apiGrid)
      storage.load()
      applySavedHints()
    }

    // user click
    function cycle (idx) {
      engine.cycleEngineHint(idx)
      const classes = engine.tiles.value[idx].filter(c => c.startsWith('hint-'))
      storage.toggle(idx, classes)
      applySavedHints()
    }

    // clear hints
    function clear () {
      engine.clearEngineHints()
      storage.clear()
    }

    cache[landId] = {
      tiles: engine.tiles,
      update,
      cycle,
      clear
    }
  }

  return cache[landId]
}
