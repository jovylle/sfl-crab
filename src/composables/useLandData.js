// src/composables/useLandData.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'
import { PRACTICE_PATTERN_CACHE_KEY } from '@/composables/usePracticePatterns.js'

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

  // If local storage doesn't yet have today's patterns, try to fetch the
  // Netlify function (which benefits from Netlify's CDN cache via s-maxage).
  // This only runs in the browser (no-op during SSR).
  if (typeof window !== 'undefined') {
    ;(async () => {
      try {
        const cached = practicePatternCache.value
        if (cached?.date === todayUTC && Array.isArray(cached.patterns) && cached.patterns.length) {
          return
        }

        const res = await fetch(PRACTICE_ENDPOINT, { headers: { 'Content-Type': 'application/json' } })
        if (!res.ok) return
        const payload = await res.json()
        // Normalize payload: function returns visitedFarmState at root
        const visited = payload?.visitedFarmState || payload?.farm || payload || {}
        const patterns = visited.desert?.digging?.patterns || []

        if (Array.isArray(patterns) && patterns.length) {
          practicePatternCache.value = {
            date: todayUTC,
            fetchedAt: Date.now(),
            patterns,
          }
        }
      } catch (err) {
        // swallow fetch errors; app will continue to work with defaults
        // CDN/backing API may be unreachable — that's okay.
        // console.debug('practice-patterns fetch failed', err)
      }
    })()
  }

  return { landData, inventory, desert, patternKeys, dailyPatternKeys }
}
