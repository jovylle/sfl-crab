// src/composables/useLandSync.js
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useLandData } from '@/composables/useLandData'
import { fetchLandData } from '@/services/landSyncService'

const instances = new Map()

export function useLandSync (opts = {}) {
  let landId 
  if (opts.landId) {
     landId = opts.landId || null
  } else {
    const route = useRoute()
    landId = route.params.landId
  }
  const cooldownKey = `landCooldownEnd_${landId}`

  if (!instances.has(landId)) {
    // 1️⃣ grab the landData ref once, at composable init:
    const { landData } = useLandData()

    // 2️⃣ shared reactive state
    const isLoading = ref(false)
    const isCooldown = ref(false)
    const remaining = ref(0)
    let intervalId

    // helper to clear cooldown
    function clearCooldown () {
      isCooldown.value = false
      remaining.value = 0
      localStorage.removeItem(cooldownKey)
      clearInterval(intervalId)
    }

    // start countdown from an absolute endTime (ms)
    function startCountdown (endTime) {
      isCooldown.value = true
      // tick down remaining
      intervalId = setInterval(() => {
        const msLeft = endTime - Date.now()
        if (msLeft <= 0) {
          clearCooldown()
        } else {
          remaining.value = Math.ceil(msLeft / 1000)
        }
      }, 250)
    }

    // on init, restore any in-flight cooldown from localStorage
    const stored = Number(localStorage.getItem(cooldownKey))
    if (stored > Date.now()) {
      startCountdown(stored)
    }

    onBeforeUnmount(() => clearInterval(intervalId))

    // 3️⃣ reload logic (never re-calls useLandData/useRoute)
    async function reloadFromServer (opts = {}) {
      const { force = false, landId: overrideLandId } = opts
      const targetLandId = overrideLandId || landId
      if (isLoading.value || (isCooldown.value && !force)) return

      isLoading.value = true

      try {
        const fresh = await fetchLandData(targetLandId)
        landData.value = {
          date: new Date().toISOString().slice(0, 10),
          ...fresh
        }
        
        const desertDigging = fresh.state.desert.digging
        const username     = fresh.state.username  // ← pull from state.username

        window.dispatchEvent(
          new CustomEvent('landDataReady', {
            detail: { desertDigging, username }
          })
        )
      } catch (err) {
        // 👇 Show a friendly alert for the 429 error or anything else
        alert(err.message || 'An unexpected error occurred while loading land data.')
      } finally {
        isLoading.value = false

        if (!force && !isCooldown.value) {
          const endTime = Date.now() + 15_000
          localStorage.setItem(cooldownKey, String(endTime))
          startCountdown(endTime)
        }
      }
    }
    

    instances.set(landId, { isLoading, isCooldown, remaining, reloadFromServer })
  }

  return instances.get(landId)
}
