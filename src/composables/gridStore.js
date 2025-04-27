// src/composables/gridStore.js
import { useGrid } from './useGrid'

// export a function that you call inside setup()
export function useGridStore () {
  return useGrid()
}
