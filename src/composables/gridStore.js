// src/composables/gridStore.js
import { useGrid } from './useGrid'
import { useRoute } from 'vue-router'

const cache = {}

export function useGridStore () {
  const landId = useRoute().params.landId
  if (!cache[landId]) {
    cache[landId] = useGrid(landId)
    // preload the API grid once:
    cache[landId].loadFromLocalStorage()
  }
  return cache[landId]
}
