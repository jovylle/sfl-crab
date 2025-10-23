// src/composables/useGridManager.js
import { useGridEngine } from './useGridEngine'
import { useHintsStorage } from './useHintsStorage'

const cache = {}

export function useGridManager (rawLandId, gridSize = 10) {
  const landKey = rawLandId || '0'

  if (!cache[landKey]) {
    // 1️⃣ core engine + storage
    const engine = useGridEngine(gridSize)
    const storage = useHintsStorage(landKey)
    
    // 2️⃣ history stack for undo functionality
    const history = []
    const MAX_HISTORY = 10

    // reapply saved hints on-top of the engine’s base grid
    function applySavedHints () {
      engine.clearEngineHints()
      for (const [idxStr, classes] of Object.entries(storage.hints.value)) {
        const idx = Number(idxStr)
        classes.forEach(hintClass => {
          engine.pickEngineHint(idx, hintClass)
        })
      }
    }

    // initial load
    applySavedHints()

    // on API update: rebuild engine + reapply storage
    function update (apiGrid) {
      engine.updateGridFromData(apiGrid)
      storage.load()
      applySavedHints()
    }

    // // inside src/composables/useGridManager.js
    // function cycle (index, hintClass = null) {
    //   if (hintClass !== null) {
    //     // explicit pick
    //     engine.pickEngineHint(index, hintClass)
    //     // persist to storage…
    //     storage.hints.value[index] = hintClass ? [hintClass] : []
    //     storage.save()
    //   } else {
    //     // fallback: cycle through the order
    //     engine.cycleEngineHint(index)
    //     // persist whichever hint is now applied (or clear)
    //     const cell = engine.tiles.value[index]
    //     const picked = cell.find(c => c.startsWith('hint-'))
    //     if (picked) storage.hints.value[index] = [picked]
    //     else delete storage.hints.value[index]
    //     storage.save()
    //   }
    // }


    // clear everything
    function clear () {
      // remove all hint-*/near-hint-* classes
      engine.clearEngineHints()
      // wipe out stored hints
      storage.clear()
      // write the empty map back to localStorage
      storage.save()
      // clear history when clearing all
      history.length = 0
    }

    // undo last action
    function undo () {
      if (history.length === 0) return false
      
      const lastAction = history.pop()
      
      if (lastAction.action === 'mark') {
        // restore previous state
        if (lastAction.oldClasses.length === 0) {
          // was empty, remove from storage
          delete storage.hints.value[lastAction.tileIndex]
        } else {
          // restore old classes
          storage.hints.value[lastAction.tileIndex] = [...lastAction.oldClasses]
        }
        
        // reapply all hints to engine
        applySavedHints()
        storage.save()
        return true
      }
      
      return false
    }

    // add action to history
    function addToHistory (action) {
      history.push(action)
      // keep only last MAX_HISTORY actions
      if (history.length > MAX_HISTORY) {
        history.shift()
      }
    }


    cache[landKey] = {
      tiles: engine.tiles,
      update,
      // cycle, removed
      pick (index, hintClass) {
        engine.pickEngineHint(index, hintClass);

        // 🔒 Normalize to a flat array
        const flat = Array.isArray(hintClass)
          ? hintClass
          : [hintClass];

        // 🛡️ Optional extra flatten check
        if (Array.isArray(flat[0])) {
          console.warn("🚨 Nested hintClass array detected:", flat);
          storage.hints.value[index] = flat[0]; // flatten manually
        } else {
          storage.hints.value[index] = flat;
        }

        storage.save();
      },
      clear
    }
  }

  return cache[landKey]
}
