import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { fetchPracticePatterns } from '@/services/practicePatternService'
import { PRACTICE_CONSTANTS } from '@/data/app/constants'

const todayUTC = () => new Date().toISOString().slice(0, 10)

const cacheKey = `practice:today-patterns:${PRACTICE_CONSTANTS.ADAM_OWNER_ID}`

const defaultCache = {
  date: '',
  fetchedAt: 0,
  landId: PRACTICE_CONSTANTS.ADAM_OWNER_ID,
  patterns: [],
}

export function usePracticePatterns () {
  const cache = useStorage(cacheKey, { ...defaultCache })
  const isLoading = ref(false)
  const error = ref('')

  const isCachedForToday = computed(() => cache.value.date === todayUTC() && (cache.value.patterns || []).length > 0)
  const patternKeys = computed(() => (isCachedForToday.value ? cache.value.patterns : []))

  async function refreshPracticePatterns ({ force = false } = {}) {
    if (isLoading.value) return cache.value
    if (!force && isCachedForToday.value) return cache.value

    isLoading.value = true
    error.value = ''

    try {
      const fresh = await fetchPracticePatterns()
      const visitedFarmState = fresh?.visitedFarmState || {}
      const patterns = visitedFarmState.desert?.digging?.patterns || []

      cache.value = {
        date: todayUTC(),
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
    }
  }

  return {
    error,
    isCachedForToday,
    isLoading,
    patternKeys,
    refreshPracticePatterns,
  }
}
