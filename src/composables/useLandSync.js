// src/composables/useLandSync.js
//
// Thin UI wrapper over landFetchCoordinator. Owns the visible refresh state
// (isLoading / isCooldown / remaining countdown); ALL network decisions live
// in the coordinator (freshness, single-flight, cooldown, bypass policy).

import { ref, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useLandData } from '@/composables/useLandData'
import { requestLandData } from '@/services/landFetchCoordinator'
import { getLandCooldownStorageKey } from '@/config/api.js'

const instances = new Map()

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
      clearInterval(intervalId)
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
      const { force = false, bypassCache = false, landId: overrideLandId } = opts
      const targetLandId = overrideLandId || landId
      if (isLoading.value || (isCooldown.value && !force)) return

      isLoading.value = true

      try {
        const data = await requestLandData(targetLandId, { force, bypassCache })
        lastFetchFailed = false

        // Suppressed (cooldown active, nothing new) — keep current data as-is.
        if (!data) return

        landData.value = data

        const desertDigging = data.visitedFarmState?.desert?.digging
        const username = data.visitedFarmState?.username
        if (desertDigging) {
          window.dispatchEvent(
            new CustomEvent('landDataReady', {
              detail: { desertDigging, username },
            }),
          )
        }
      } catch (err) {
        lastFetchFailed = true
        alert(err.message || 'An unexpected error occurred while loading land data.')
      } finally {
        isLoading.value = false
        // Re-sync the cooldown UI from the coordinator's authoritative state.
        const end = Number(localStorage.getItem(cooldownKey))
        if (end > Date.now()) {
          startCountdown(end)
        }
      }
    }

    instances.set(landId, { isLoading, isCooldown, remaining, reloadFromServer })
  }

  return instances.get(landId)
}
