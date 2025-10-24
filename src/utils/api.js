import { getApiHeaders } from '@/config/api.js'

export async function fetchDesertData (landId) {
  const response = await fetch(`/api/visit/${landId}`, {
    headers: getApiHeaders()
  })
  if (!response.ok) throw new Error('Failed to fetch data.')
  const data = await response.json()
  return data // 🔥 Return the full API response
}
