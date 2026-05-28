import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { getTodayUTC } from '@/utils/buildDigTimeline.js'

const instances = new Map()

function noopPatternMarks () {
  const markedIndexes = computed(() => new Set())
  return {
    markedIndexes,
    toggleMark: () => {},
    isMarked: () => false,
  }
}

/**
 * Per-land, per-UTC-day toggles on today's pattern thumbs (green highlight).
 * @param {string} landId
 */
export function usePatternMarks (landId) {
  const key = String(landId || '')
  if (!key || key === 'guest' || key === '0') {
    return noopPatternMarks()
  }

  if (!instances.has(key)) {
    const todayUTC = getTodayUTC()
    const storageKey = `patternMarks_${key}_${todayUTC}`
    const stored = useStorage(storageKey, [])

    const markedIndexes = computed(() => new Set(stored.value || []))

    function toggleMark (index) {
      const next = new Set(stored.value || [])
      if (next.has(index)) next.delete(index)
      else next.add(index)
      stored.value = [...next]
    }

    function isMarked (index) {
      return markedIndexes.value.has(index)
    }

    instances.set(key, { markedIndexes, toggleMark, isMarked })
  }

  return instances.get(key)
}
