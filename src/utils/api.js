import { API_CONFIG, getApiHeaders } from '@/config/api.js'

export async function fetchDesertData (landId) {
  const response = await fetch(`${API_CONFIG.ENDPOINTS.primary}${landId}`, {
    headers: getApiHeaders()
  })
  if (!response.ok) throw new Error('Failed to fetch data.')
  const data = await response.json()
  return data // 🔥 Return the full API response
}
