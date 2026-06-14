// src/composables/useLandSync.js
import { ref, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useLandData } from '@/composables/useLandData'
import { fetchLandData } from '@/services/landSyncService'
import { getLandCooldownStorageKey } from '@/config/api.js'

const instances = new Map()
const SUCCESS_COOLDOWN_MS = 15_000
const FAILURE_COOLDOWN_MS = 30_000

export function useLandSync (opts = {}) {
  let landId
  if (opts.landId) {
    landId = opts.landId || null
  } else {
    const route = useRoute()
    landId = route.params.landId
  }
  const cooldownKey = getLandCooldownStorageKey(landId)

  if (!instances.has(landId)) {
    const { landData } = useLandData()

    const isLoading = ref(false)
    const isCooldown = ref(false)
    const remaining = ref(0)
    let intervalId
    let lastFetchFailed = false

    function clearCooldown () {
      isCooldown.value = false
      remaining.value = 0
      localStorage.removeItem(cooldownKey)
      clearInterval(intervalId)
    }

    function startCountdown (endTime) {
      isCooldown.value = true
      intervalId = setInterval(() => {
        const msLeft = endTime - Date.now()
        if (msLeft <= 0) {
          clearCooldown()
        } else {
          remaining.value = Math.ceil(msLeft / 1000)
        }
      }, 250)
    }

    const stored = Number(localStorage.getItem(cooldownKey))
    if (stored > Date.now()) {
      startCountdown(stored)
    }

    onBeforeUnmount(() => clearInterval(intervalId))

    async function reloadFromServer (opts = {}) {
      const { force = false, landId: overrideLandId } = opts
      const targetLandId = overrideLandId || landId
      if (isLoading.value || (isCooldown.value && !force)) return

      isLoading.value = true

      try {
        const fresh = await fetchLandData(targetLandId)
        lastFetchFailed = false
        landData.value = {
          date: new Date().toISOString().slice(0, 10),
          fetchedAt: Date.now(),
          ...fresh,
        }

        const desertDigging = fresh.visitedFarmState.desert.digging
        const username = fresh.visitedFarmState.username

        window.dispatchEvent(
          new CustomEvent('landDataReady', {
            detail: { desertDigging, username },
          }),
        )
      } catch (err) {
        lastFetchFailed = true
        alert(err.message || 'An unexpected error occurred while loading land data.')
      } finally {
        isLoading.value = false

        if (!force && !isCooldown.value) {
          const cooldownMs = lastFetchFailed ? FAILURE_COOLDOWN_MS : SUCCESS_COOLDOWN_MS
          const endTime = Date.now() + cooldownMs
          localStorage.setItem(cooldownKey, String(endTime))
          startCountdown(endTime)
        }
      }
    }

    instances.set(landId, { isLoading, isCooldown, remaining, reloadFromServer })
  }

  return instances.get(landId)
}
