// src/composables/useLandData.js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStorage } from '@vueuse/core'

export function useLandData (defaults = {}) {
  const route = useRoute()
  const landId = route.params.landId

  // reactive + persisted ref
  const landData = useStorage(
    `landData_${landId}`,    // key in localStorage
    { ...defaults }          // initial value if no stored data
  )

  // derived pieces
  const inventory = computed(() => landData.value.state?.inventory || {})
  const desert = computed(() => landData.value.state?.desert || {})
  const patternKeys = computed(() => desert.value.digging?.patterns || [])

  return { landData, inventory, desert, patternKeys }
}
