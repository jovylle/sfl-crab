import { ref, computed } from 'vue'
import { onSoftReload } from './softReloadRegistry'

/**
 * Shared ref holding the parsed landData blob.
 * It gets reloaded automatically on every soft-reload.
 */
const landData = ref({})

function loadLandDataFromStorage () {
  const raw = localStorage.getItem('landData')
  if (raw) {
    try {
      landData.value = JSON.parse(raw)
    } catch {
      console.error('Invalid JSON in localStorage.landData')
      landData.value = {}
    }
  } else {
    landData.value = {}
  }
}

// run on initial import
loadLandDataFromStorage()

// re-run on each soft-reload
onSoftReload('useLandData.reload', loadLandDataFromStorage)

/**
 * Composable to grab reactive slices of landData
 */
export function useLandData () {
  // e.g. username
  const username = computed(() => landData.value.state?.username || '')

  // bumpkin id
  const bumpkinId = computed(() => landData.value.state?.bumpkin?.id || '')

  // the digging grid array
  const grid = computed(
    () => landData.value.state?.desert?.digging?.grid || []
  )

  // ← new: today’s pattern keys
  const patternKeys = computed(
    () => landData.value.state?.desert?.digging?.patterns || []
  )

  return {
    // full blob, plus whatever you need
    landData,
    username,
    bumpkinId,
    grid,
    patternKeys
  }
}
