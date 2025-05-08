// src/composables/useLandSync.js
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { syncLandDataFromServerToLocalStorage } from '@/services/landSyncService'
import { useLandData } from '@/composables/useLandData'

const syncInstances = new Map()  // landId -> { isRefreshing, isCooldown, isRefreshDisabled, refresh }

export function useLandSync () {
  const route = useRoute()
  const landId = route.params.landId

  if (!syncInstances.has(landId)) {
    const isRefreshing = ref(false)
    const isCooldown = ref(false)
    const isRefreshDisabled = computed(() => isRefreshing.value || isCooldown.value)

    // bring in the singleton reload
    const { reload } = useLandData()

    async function refresh () {
      if (isRefreshDisabled.value) return
      isRefreshing.value = true
      try {
        await syncLandDataFromServerToLocalStorage(landId)
        reload()  // update the single shared landData
        // start your 15s cooldown...
        isCooldown.value = true
        setTimeout(() => (isCooldown.value = false), 15000)
      } finally {
        isRefreshing.value = false
      }
    }

    syncInstances.set(landId, { isRefreshing, isCooldown, isRefreshDisabled, refresh })
  }

  return syncInstances.get(landId)
}
