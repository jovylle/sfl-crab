// usePredictionEngine.js — reactive wrapper around solveTreasures.
//
// Watches tiles / patternKeys / enabled and recomputes guaranteed treasure
// locations off the main thread via requestIdleCallback (with a setTimeout
// fallback), so a heavy solve never blocks the UI.

import { ref, watch } from 'vue'
import { solveTreasures } from '@/utils/treasureSolver.js'

export function usePredictionEngine(tilesRef, patternKeysRef, enabledRef, gridSize = 10) {
  const guaranteed = ref(new Set())
  const guaranteedSlugs = ref(new Map())

  const schedule = (typeof window !== 'undefined' && window.requestIdleCallback)
    ? window.requestIdleCallback.bind(window)
    : (cb => setTimeout(cb, 0))
  const cancel = (typeof window !== 'undefined' && window.cancelIdleCallback)
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout

  let idleId = null

  function recompute() {
    if (idleId != null) { cancel(idleId); idleId = null }

    if (!enabledRef.value) {
      guaranteed.value = new Set()
      guaranteedSlugs.value = new Map()
      return
    }

    idleId = schedule(() => {
      idleId = null
      const result = solveTreasures(tilesRef.value, patternKeysRef.value, gridSize)
      guaranteed.value = result.guaranteed
      guaranteedSlugs.value = result.guaranteedSlugs
    })
  }

  watch(
    [tilesRef, patternKeysRef, enabledRef],
    recompute,
    { immediate: true, deep: true }
  )

  return { guaranteed, guaranteedSlugs }
}
