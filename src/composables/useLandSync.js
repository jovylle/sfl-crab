// src/composables/useLandSync.js
//
// Thin UI wrapper over landFetchCoordinator. Owns the visible refresh state
// (isLoading / isCooldown / remaining countdown + lastError); ALL network
// decisions live in the coordinator (freshness, single-flight, cooldown,
// bypass policy). VIP-gate errors are surfaced as reactive state, not alert().
//
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useLandData } from '@/composables/useLandData'
import { requestLandData } from '@/services/landFetchCoordinator'
import { getLandCooldownStorageKey } from '@/config/api.js'
import { isVipGateError } from '@/services/landApiService.js'

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
    const lastError = ref(null)
    const lastErrorIsVipGate = computed(() => isVipGateError(lastError.value))
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

    function clearError () {
      lastError.value = null
    }

    async function reloadFromServer (opts = {}) {
      const { force = false, bypassCache = false, landId: overrideLandId } = opts
      const targetLandId = overrideLandId || landId
      if (isLoading.value || (isCooldown.value && !force)) return

      isLoading.value = true
      lastError.value = null
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
        lastError.value = err
        // Keep non-gate errors quiet too — UI will render them; no alert() popups.
        if (!isVipGateError(err)) {
          console.warn('[landSync] fetch failed:', err.message)
        }
      } finally {
        isLoading.value = false
        // Re-sync the cooldown UI from the coordinator's authoritative state.
        const end = Number(localStorage.getItem(cooldownKey))
        if (end > Date.now()) {
          startCountdown(end)
        }
      }
    }

    instances.set(landId, { isLoading, isCooldown, remaining, lastError, lastErrorIsVipGate, reloadFromServer, clearError })
  }

  return instances.get(landId)
}
