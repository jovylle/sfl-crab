import { API_CONFIG, getApiHeaders, isTestApiEnvironment } from '@/config/api.js'

// Normalize response format to match primary API structure
function normalizeApiResponse (data, apiType = 'backup') {
  if (apiType === 'primary') {
    // Primary API: {visitedFarmState: {gameObject}}
    return data
  }
  if (apiType === 'backup') {
    // Backup API: {farm: {gameObject}} -> normalize to {visitedFarmState: {gameObject}}
    if (data.farm) {
      return {
        visitedFarmState: data.farm,
      }
    }
  }
  return data
}

function landNotFoundError () {
  return new Error(
    isTestApiEnvironment()
      ? 'Land not found on test server. Check the land ID or switch to production API.'
      : 'Land not found. If this is a testnet farm, enable test server mode or add ?testnet to the URL.',
  )
}

export async function fetchLandDataFromServer (landId) {
  if (!landId) throw new Error('landId is required')

  try {
    const response = await fetch(`${API_CONFIG.ENDPOINTS.primary}${landId}`, {
      headers: getApiHeaders(),
    })

    if (response.ok) {
      const data = await response.json()
      return normalizeApiResponse(data, 'primary')
    }

    if (response.status === 404) {
      const backupResponse = await fetch(`${API_CONFIG.ENDPOINTS.backup}${landId}`, {
        headers: getApiHeaders(),
      })

      if (backupResponse.ok) {
        const data = await backupResponse.json()
        return normalizeApiResponse(data, 'backup')
      }

      if (backupResponse.status === 404) {
        throw landNotFoundError()
      }

      if (backupResponse.status === 429) {
        throw new Error('You are sending requests too quickly. Please wait a moment before trying again.')
      }

      throw new Error('Failed to fetch land data from backup API.')
    }

    if (response.status === 429) {
      throw new Error('You are sending requests too quickly. Please wait a moment before trying again.')
    }

    throw new Error('Failed to fetch land data.')

  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.')
    }
    throw error
  }
}
