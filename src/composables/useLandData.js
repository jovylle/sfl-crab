// useLandData.js
import { ref, computed } from 'vue'
import { onSoftReload } from './softReloadRegistry'

export function useLandData (landId) {
  const landData = ref({})

  function loadLandDataFromStorage () {
    const raw = localStorage.getItem(`landData_${landId}`)
    if (raw) {
      try {
        landData.value = JSON.parse(raw)
      } catch {
        console.error(`Invalid JSON in localStorage.landData_${landId}`)
        landData.value = {}
      }
    } else {
      landData.value = {}
    }
  }

  loadLandDataFromStorage()
  onSoftReload(`useLandData.reload.${landId}`, loadLandDataFromStorage)

  const username = computed(() => landData.value.state?.username || '')
  const bumpkinId = computed(() => landData.value.state?.bumpkin?.id || '')
  const grid = computed(() => landData.value.state?.desert?.digging?.grid || [])
  const patternKeys = computed(() => landData.value.state?.desert?.digging?.patterns || [])

  return {
    landData,
    username,
    bumpkinId,
    grid,
    patternKeys
  }
}
