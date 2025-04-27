import { useGrid } from './useGrid'
import { useRoute } from 'vue-router'

const cache = {}

export function useGridStore () {
  const landId = useRoute().params.landId || ''
  if (!cache[landId]) {
    cache[landId] = useGrid(landId)
    // Preload once from your saved API blob
    cache[landId].loadFromLocalStorage()
  }
  console.log('useGridStore', landId, cache[landId])
  return cache[landId]
}
