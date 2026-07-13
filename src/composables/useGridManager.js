// src/composables/useGridManager.js
import { ref } from 'vue'
import { useGridEngine } from './useGridEngine'
import { useHintsStorage } from './useHintsStorage'
import { getMarkJournalHandlers } from './markJournalBridge'
import { isRevealed } from '@/utils/tileState'

const cache = {}

export function useGridManager (rawLandId, gridSize = 10) {
  const landKey = rawLandId || '0'

  if (!cache[landKey]) {
    // 1️⃣ core engine + storage
    const engine = useGridEngine(gridSize)
    const storage = useHintsStorage(landKey)

    // Indices dug since the previous update — transient, drives the live
    // shovel reveal animation. First update (mount) is skipped so we don't
    // animate the whole board on load.
    const newlyDug = ref(new Set())
    let hasLoadedOnce = false
    let clearNewlyDugTimer = null


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
      const before = engine.tiles.value.map(isRevealed)

      engine.updateGridFromData(apiGrid)
      storage.load()
      applySavedHints()

      // Diff old vs new to find freshly-revealed tiles (false → true).
      if (hasLoadedOnce) {
        const after = engine.tiles.value.map(isRevealed)
        const dug = new Set()
        for (let i = 0; i < after.length; i++) {
          if (after[i] && !before[i]) dug.add(i)
        }
        if (dug.size) {
          newlyDug.value = dug
          if (clearNewlyDugTimer) clearTimeout(clearNewlyDugTimer)
          clearNewlyDugTimer = setTimeout(() => {
            newlyDug.value = new Set()
          }, 900)
        }
      }
      hasLoadedOnce = true
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
      const journalHandlers = getMarkJournalHandlers(landKey)
      journalHandlers?.onClearAll?.()

      // remove all hint-*/near-hint-* classes
      engine.clearEngineHints()
      // wipe out stored hints
      storage.clear()
      // write the empty map back to localStorage
      storage.save()
    }



    cache[landKey] = {
      tiles: engine.tiles,
      newlyDug,
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

        const journalHandlers = getMarkJournalHandlers(landKey)
        journalHandlers?.onPick?.(index, flat)
      },
      clear
    }
  }

  return cache[landKey]
}
