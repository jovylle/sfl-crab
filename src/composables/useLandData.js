// src/composables/useLandData.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import { PRACTICE_PATTERN_CACHE_KEY, usePracticePatterns } from '@/composables/usePracticePatterns.js'

const PRACTICE_ENDPOINT = '/.netlify/functions/practice-patterns'

export function useLandData (defaults = {}) {
  const route = useRoute()
  const landId = route.params.landId
  const storageKey = `landData_${landId}`
  const todayUTC = new Date().toISOString().slice(0, 10)

  // reactive + persisted ref
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
    return cached?.date === todayUTC && Array.isArray(cached.patterns)
      ? cached.patterns
      : []
  })

  // If local storage doesn't yet have today's patterns, ask the practice
  // patterns composable to refresh (it implements single-flight so
  // concurrent callers share one network request).
  if (typeof window !== 'undefined') {
    ;(async () => {
      try {
        const cached = practicePatternCache.value
        if (cached?.date === todayUTC && Array.isArray(cached.patterns) && cached.patterns.length) {
          return
        }

        const { refreshPracticePatterns } = usePracticePatterns()
        await refreshPracticePatterns()
      } catch (err) {
        // ignore errors; we simply fall back to empty cache/local defaults
      }
    })()
  }

  return { landData, inventory, desert, patternKeys, dailyPatternKeys }
}
