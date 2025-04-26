// src/composables/useLandService.js
import { ref } from 'vue'
import { fetchLandData } from '@/api/landApi'
import { saveLandData, getLandData, clearLandData } from '@/services/landService'

export function useLandService () {
  const loading = ref(false)
  const error = ref('')

  // Fetch and overwrite your `landData` blob in localStorage
  async function loadLandData (id) {
    loading.value = true
    error.value = ''
    try {
      const json = await fetchLandData(id)
      saveLandData(json)
      return json
    } catch (err) {
      console.error(err)
      error.value = 'Failed to load Land data.'
    } finally {
      loading.value = false
    }
  }

  // Wipe it out if you ever need to
  function clearLandDataCache () {
    clearLandData()
  }

  return { loading, error, loadLandData, clearLandDataCache }
}
