// src/composables/useLandData.js
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getLocalStoredLandData } from '@/utils/storageHelpers'

const instances = new Map()  // landId -> { landData, inventory, desert, reload }

export function useLandData (defaults = {}) {
  const route = useRoute()
  const landId = route.params.landId

  if (!instances.has(landId)) {
    // create it once
    const landData = ref({ ...defaults })
    function reload () {
      const stored = getLocalStoredLandData(landId)
      landData.value = stored || { ...defaults }
    }
    onMounted(reload)

    const inventory = computed(() => landData.value.state?.inventory || {})
    const desert = computed(() => landData.value.state?.desert || {})
    // derive the pattern keys directly from the desert digging state
    const patternKeys = computed(() =>
      desert.value.digging?.patterns || []
    )

    // store the full API surface for this landId
    instances.set(landId, {
      landData,
      inventory,
      desert,
      patternKeys,
      reload
    })
  }

  return instances.get(landId)
}
