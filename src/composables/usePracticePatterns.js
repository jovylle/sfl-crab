import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { fetchPracticePatterns } from '@/services/practicePatternService'
import { PRACTICE_CONSTANTS } from '@/data/app/constants'

const getTodayUTC = () => new Date().toISOString().slice(0, 10)

const cacheKey = `practice:today-patterns:${PRACTICE_CONSTANTS.ADAM_OWNER_ID}`

export const PRACTICE_PATTERN_CACHE_KEY = cacheKey

const defaultCache = {
  date: '',
  fetchedAt: 0,
  landId: PRACTICE_CONSTANTS.ADAM_OWNER_ID,
  patterns: [],
}

// Module-scoped single-flight promise shared by all composable instances
let ongoingFetch = null

function readCachedPatternsFromStorage () {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage?.getItem(cacheKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed?.date !== getTodayUTC()) return []
    return Array.isArray(parsed.patterns) ? parsed.patterns : []
  } catch (error) {
    console.warn('Failed to parse practice pattern cache:', error)
    return []
  }
}

export function readCachedPracticePatterns () {
  return readCachedPatternsFromStorage()
}

export function usePracticePatterns () {
  const cache = useStorage(cacheKey, { ...defaultCache })
  const isLoading = ref(false)
  const error = ref('')
  // single-flight promise to avoid duplicate network requests
  let ongoingFetch = null

  const isCachedForToday = computed(() => cache.value.date === getTodayUTC() && (cache.value.patterns || []).length > 0)
  const patternKeys = computed(() => (isCachedForToday.value ? cache.value.patterns : []))

  async function refreshPracticePatterns ({ force = false } = {}) {
    if (!force && isCachedForToday.value) return cache.value

    // If a fetch is already in progress, return the same promise
    if (ongoingFetch) {
      return ongoingFetch
    }

    isLoading.value = true
    error.value = ''

    ongoingFetch = (async () => {
      try {
        const fresh = await fetchPracticePatterns()
        const visitedFarmState = fresh?.visitedFarmState || {}
        const patterns = visitedFarmState.desert?.digging?.patterns || []

        cache.value = {
          date: getTodayUTC(),
          fetchedAt: Date.now(),
          landId: PRACTICE_CONSTANTS.ADAM_OWNER_ID,
          patterns,
        }

        return cache.value
      } catch (err) {
        error.value = err?.message || "Failed to load today's practice patterns."

        if (patternKeys.value.length > 0) {
          return cache.value
        }

        throw err
      } finally {
        isLoading.value = false
        ongoingFetch = null
      }
    })()

    return ongoingFetch
  }

  return {
    error,
    isCachedForToday,
    isLoading,
    patternKeys,
    refreshPracticePatterns,
  }
}
