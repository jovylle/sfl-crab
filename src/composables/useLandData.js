// src/composables/useLandData.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'

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

  // derived pieces
  const inventory = computed(() => landData.value.visitedFarmState?.inventory || {})
  const desert = computed(() => landData.value.visitedFarmState?.desert || {})
  const patternKeys = computed(() => desert.value.digging?.patterns || [])

  return { landData, inventory, desert, patternKeys }
}
