import { ref } from 'vue'
import { fetchDesertData } from '../utils/api'

export function useLandData() {
  const landId = ref(localStorage.getItem('landId') || '')
  const errorMessage = ref('')
  const isRefreshing = ref(false)
  const refreshCountdown = ref(0)
  let refreshTimer = null

  async function submitLandId(id) {
    try {
      errorMessage.value = ''
      const data = await fetchDesertData(id)
      localStorage.setItem('landId', id)
      localStorage.setItem('desertData', JSON.stringify(data))
      updateGridFromData(data) // 🔥 refresh the tiles
      landId.value = id
    } catch (error) {
      errorMessage.value = 'Error fetching data. Please try again later.'
    }
  }

  function clearLandId() {
    localStorage.removeItem('landId')
    localStorage.removeItem('desertData')
    landId.value = ''
  }

  async function refreshData() {
    if (isRefreshing.value) return

    isRefreshing.value = true
    refreshCountdown.value = 10
    refreshTimer = setInterval(() => {
      refreshCountdown.value--
      if (refreshCountdown.value <= 0) {
        clearInterval(refreshTimer)
        isRefreshing.value = false
      }
    }, 1000)

    try {
      const data = await fetchDesertData(landId.value)
      localStorage.setItem('desertData', JSON.stringify(data))
      updateGridFromData(data) // 🔥 refresh the tiles
    } catch (error) {
      errorMessage.value = 'Error refreshing data. Please try again later.'
    }
  }

  return {
    landId,
    errorMessage,
    isRefreshing,
    refreshCountdown,
    submitLandId,
    clearLandId,
    refreshData,
  }
}