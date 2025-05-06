// useLandService.js
import { ref } from 'vue'
import { fetchLandData } from '@/api/landApi'
import { saveLandData, clearLandData } from '@/services/landService'

export function useLandService (landId) {
  const loading = ref(false)
  const error = ref('')

  async function loadLandData () {
    loading.value = true
    error.value = ''
    try {
      const json = await fetchLandData(landId)
      saveLandData(json, landId)
      return json
    } catch (err) {
      console.error(err)
      error.value = 'Failed to load Land data.'
    } finally {
      loading.value = false
    }
  }

  function clearLandDataCache () {
    clearLandData(landId)
  }

  return { loading, error, loadLandData, clearLandDataCache }
}
