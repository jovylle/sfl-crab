// src/composables/useGrid.js
import { ref, watch } from 'vue'
import { getLandIdFromUrl } from '@/utils/getLandId'

export function useGrid (gridSize = 10) {
  const landId = getLandIdFromUrl()
  const STORAGE_KEY = `gridCustomHints_${landId}`

  const tiles = ref(Array(gridSize * gridSize).fill([]))
  const hintCounts = ref(
    Array(gridSize * gridSize).fill(null).map(() => ({}))
  )

  // ─── Core API grid loader ───────────────────────────────────────────────────
  function updateGridFromData (grid) {
    if (!grid) {
      console.warn('No valid digging.grid found in desertData:', grid)
      return
    }

    // reset base tiles
    tiles.value = Array(gridSize * gridSize).fill([])

    grid.forEach(tile => {
      const idx = tile.y * gridSize + tile.x
      if (tile.items?.Crab) {
        tiles.value[idx] = ['crab']
        applyHint(tile.x, tile.y, 'near-crab')
      } else if (tile.items?.Sand) {
        tiles.value[idx] = ['sand']
        applyHint(tile.x, tile.y, 'near-sand')
      } else {
        tiles.value[idx] = ['treasure']
      }
    })

    // make sure Vue sees the update
    tiles.value = [...tiles.value]

    // then re-apply any custom hints
    loadCustomHints()
  }

  // ─── Hint neighbor logic ──────────────────────────────────────────────────
  function applyHint (x, y, hintClass) { /* unchanged… */ }
  function removeHint (x, y, hintClass) { /* unchanged… */ }

  function getXY (index) {
    return { x: index % gridSize, y: Math.floor(index / gridSize) }
  }

  // ─── Cycle user-driven hints & persist ────────────────────────────────────
  function cycleHintAt (index) {
    const apiClasses = ['sand', 'near-sand', 'crab', 'treasure', 'near-hint-sand']
    const current = tiles.value[index]
    if (current.some(c => apiClasses.includes(c))) return

    const { x, y } = getXY(index)
    const cycle = ['hint-sand', 'hint-crab', 'hint-treasure', '']
    const currentHint = cycle.find(h => current.includes(h)) || ''
    const next = cycle[(cycle.indexOf(currentHint) + 1) % cycle.length]

    // strip old hint classes
    const cleaned = current.filter(c => !cycle.includes(c))
    tiles.value[index] = next ? [...cleaned, next] : cleaned

    // update neighbor counts
    if (currentHint === 'hint-sand') removeHint(x, y, 'near-hint-sand')
    if (currentHint === 'hint-crab') removeHint(x, y, 'near-hint-crab')
    if (next === 'hint-sand') applyHint(x, y, 'near-hint-sand')
    if (next === 'hint-crab') applyHint(x, y, 'near-hint-crab')

    // persist only the “hint-…” classes
    saveCustomHints()
  }

  // ─── Persistence helpers ───────────────────────────────────────────────────
  function saveCustomHints () {
    const payload = {}
    tiles.value.forEach((classes, i) => {
      const custom = classes.filter(c => c.startsWith('hint-'))
      if (custom.length) payload[i] = custom
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function loadCustomHints () {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const hints = JSON.parse(raw)
      Object.entries(hints).forEach(([idx, classes]) => {
        const i = Number(idx)
        tiles.value[i] = [
          ...tiles.value[i].filter(c => !c.startsWith('hint-')),
          ...classes
        ]
      })
      // trigger reactivity
      tiles.value = [...tiles.value]
    } catch {
      console.warn('Invalid custom hints in localStorage')
    }
  }

  function clearCustomHints () {
    localStorage.removeItem(STORAGE_KEY)
    tiles.value = tiles.value.map(list =>
      list.filter(c => !c.startsWith('hint-'))
    )
    // reset neighbor counts if you like:
    hintCounts.value = Array(gridSize * gridSize)
      .fill(null).map(() => ({}))
  }

  // ─── Initial load from localStorage API blob ──────────────────────────────
  function loadFromLocalStorage () {
    const raw = localStorage.getItem('landData')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data?.state?.desert?.digging?.grid) {
        updateGridFromData(data.state.desert.digging.grid)
      }
    } catch (e) {
      console.error('Invalid landData in localStorage', e)
    }
  }

  return {
    tiles,
    updateGridFromData,
    loadFromLocalStorage,
    cycleHintAt,
    clearCustomHints,
  }
}
