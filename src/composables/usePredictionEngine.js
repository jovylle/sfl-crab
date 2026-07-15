// usePredictionEngine.js — reactive wrapper around solveTreasures.
//
// Watches tiles / patternKeys / enabled and recomputes guaranteed treasure
// locations off the main thread via requestIdleCallback (with a setTimeout
// fallback), so a heavy solve never blocks the UI.

import { ref, watch } from 'vue'
import { solveTreasures } from '@/utils/treasureSolver.js'

export function usePredictionEngine(tilesRef, patternKeysRef, enabledRef, { gridSize = 10, syncRef = null } = {}) {
  const guaranteed = ref(new Set())
  const guaranteedSlugs = ref(new Map())
  const guaranteedFormationKeys = ref(new Set())

  const schedule = (typeof window !== 'undefined' && window.requestIdleCallback)
    ? window.requestIdleCallback.bind(window)
    : (cb => setTimeout(cb, 0))
  const cancel = (typeof window !== 'undefined' && window.cancelIdleCallback)
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout

  let idleId = null

  function runSolve() {
    const result = solveTreasures(tilesRef.value, patternKeysRef.value, gridSize)
    guaranteed.value = result.guaranteed
    guaranteedSlugs.value = result.guaranteedSlugs
    guaranteedFormationKeys.value = result.guaranteedFormationKeys
  }

  function recompute() {
    if (idleId != null) { cancel(idleId); idleId = null }

    if (!enabledRef.value) {
      guaranteed.value = new Set()
      guaranteedSlugs.value = new Map()
      guaranteedFormationKeys.value = new Set()
      return
    }

    // Synchronous solve during GIF export so every captured frame — including
    // the last — already has its predictions (no requestIdleCallback lag).
    if (syncRef?.value) {
      runSolve()
      return
    }

    idleId = schedule(() => {
      idleId = null
      runSolve()
    })
  }

  const sources = [tilesRef, patternKeysRef, enabledRef]
  if (syncRef) sources.push(syncRef)

  watch(
    sources,
    recompute,
    { immediate: true, deep: true }
  )

  return { guaranteed, guaranteedSlugs, guaranteedFormationKeys }
}
