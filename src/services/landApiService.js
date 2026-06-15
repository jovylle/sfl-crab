import { API_CONFIG, isTestApiEnvironment } from '@/config/api.js'

function normalizeApiResponse (data) {
  if (data.farm) {
    return { visitedFarmState: data.farm }
  }
  if (data.visitedFarmState) {
    return data
  }
  return data
}

function apiHeadersForEnv (env) {
  const headers = { 'Content-Type': 'application/json' }
  if (env === 'test') {
    headers['x-sfl-api-env'] = 'test'
  }
  return headers
}

function landNotFoundError () {
  return new Error(
    isTestApiEnvironment()
      ? 'Land not found on test server. Check the land ID or switch to production API.'
      : 'Land not found. If this is a testnet farm, add ?testnet to the URL.',
  )
}

async function fetchCommunityFarm (landId, env) {
  return fetch(`${API_CONFIG.ENDPOINTS.primary}${landId}`, {
    headers: apiHeadersForEnv(env),
  })
}

export async function fetchLandDataFromServer (landId) {
  if (!landId) throw new Error('landId is required')

  const preferred = isTestApiEnvironment() ? 'test' : 'production'
  const envs = preferred === 'test' ? ['test', 'production'] : ['production', 'test']

  try {
    for (const env of envs) {
      const response = await fetchCommunityFarm(landId, env)

      if (response.ok) {
        const data = await response.json()
        return normalizeApiResponse(data)
      }

      if (response.status === 429) {
        throw new Error('You are sending requests too quickly. Please wait a moment before trying again.')
      }

      if (response.status !== 404) {
        throw new Error(`Failed to fetch land data (${response.status}).`)
      }
    }

    throw landNotFoundError()
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.')
    }
    throw error
  }
}
