// src/composables/useLandData.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import {
  PRACTICE_PATTERN_CACHE_KEY,
  PRACTICE_PATTERN_CACHE_VERSION,
  usePracticePatterns,
} from '@/composables/usePracticePatterns.js'
import { getLandDataStorageKey } from '@/config/api.js'

export function useLandData (defaults = {}) {
  const route = useRoute()
  const landId = route.params.landId
  const storageKey = computed(() => getLandDataStorageKey(landId))
  const todayUTC = new Date().toISOString().slice(0, 10)

  const landData = useStorage(storageKey, {
    date: todayUTC,
    ...defaults
  })

  // check if data is stale
  if (landData.value?.date !== todayUTC) {
    landData.value = {
      date: todayUTC,
      ...defaults
    }
  }

  const practicePatternCache = useStorage(PRACTICE_PATTERN_CACHE_KEY, {
    version: PRACTICE_PATTERN_CACHE_VERSION,
    date: '',
    fetchedAt: 0,
    patterns: [],
  })

  // derived pieces
  const inventory = computed(() => landData.value.visitedFarmState?.inventory || {})
  const desert = computed(() => landData.value.visitedFarmState?.desert || {})
  const patternKeys = computed(() => desert.value.digging?.patterns || [])
  const dailyPatternKeys = computed(() => {
    const cached = practicePatternCache.value
    return cached?.version === PRACTICE_PATTERN_CACHE_VERSION
      && typeof cached?.date === 'string'
      && cached.date
      && Array.isArray(cached.patterns)
      ? cached.patterns
      : []
  })
  const dailyPatternDate = computed(() => practicePatternCache.value?.date || '')

  // If local storage doesn't yet have today's patterns, ask the practice
  // patterns composable to refresh (it implements single-flight so
  // concurrent callers share one network request).
  if (typeof window !== 'undefined') {
    ;(async () => {
      try {
        const cached = practicePatternCache.value
        if (
          cached?.version === PRACTICE_PATTERN_CACHE_VERSION
          && cached?.date === todayUTC
          && Array.isArray(cached.patterns)
          && cached.patterns.length
        ) {
          return
        }

        const { refreshPracticePatterns } = usePracticePatterns()
        await refreshPracticePatterns()
      } catch (err) {
        // ignore errors; we simply fall back to empty cache/local defaults
      }
    })()
  }

  return { landData, inventory, desert, patternKeys, dailyPatternKeys, dailyPatternDate }
}
