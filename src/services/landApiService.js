import { API_CONFIG, isTestApiEnvironment } from '@/config/api.js'

export const SFL_VIP_GATE_CODE = 'SFL_VIP_GATE'

export function isVipGateError (err) {
  return Boolean(err && (err.code === SFL_VIP_GATE_CODE || err.isVipGate))
}

function isVipGateMessage (text) {
  if (!text) return false
  const t = String(text).toLowerCase()
  return (t.includes('vip access') && t.includes('level 50')) || t.includes('bumpkin of level 50')
}

function createVipGateError (status, raw) {
  const msg = raw || 'A community API key requires VIP access and a Bumpkin of level 50 or higher'
  const err = new Error(msg)
  err.code = SFL_VIP_GATE_CODE
  err.isVipGate = true
  err.status = status
  return err
}

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

async function fetchCommunityFarm (landId, env, { bypassCache = false } = {}) {
  const headers = apiHeadersForEnv(env)
  if (bypassCache) {
    headers['x-sfl-bypass-cache'] = '1'
  }
  return fetch(`${API_CONFIG.ENDPOINTS.primary}${landId}`, { headers })
}

async function extractErrorMessage (response) {
  try {
    const text = await response.clone().text()
    if (!text) return ''
    try {
      const json = JSON.parse(text)
      return json?.error || json?.message || text
    } catch {
      return text
    }
  } catch {
    return ''
  }
}

export async function fetchLandDataFromServer (landId, { bypassCache = false } = {}) {
  if (!landId) throw new Error('landId is required')

  const preferred = isTestApiEnvironment() ? 'test' : 'production'
  const envs = preferred === 'test' ? ['test', 'production'] : ['production', 'test']

  let lastNotFound = null
  try {
    for (const env of envs) {
      const response = await fetchCommunityFarm(landId, env, { bypassCache })

      if (response.ok) {
        const data = await response.json()
        // Even a 200 can carry the gate message in some proxy shapes — guard it.
        const maybeGate = data?.error || data?.message
        if (isVipGateMessage(maybeGate)) throw createVipGateError(response.status, maybeGate)
        return normalizeApiResponse(data)
      }

      if (response.status === 429) {
        throw new Error('You are sending requests too quickly. Please wait a moment before trying again.')
      }

      // Try to surface the real server message (including the VIP gate).
      const errMsg = await extractErrorMessage(response)
      if (isVipGateMessage(errMsg)) throw createVipGateError(response.status, errMsg)

      if (response.status !== 404) {
        throw new Error(errMsg || `Failed to fetch land data (${response.status}).`)
      }
      lastNotFound = errMsg
    }

    // None of the envs had the land — but if the last error was a gate we already threw.
    if (lastNotFound && isVipGateMessage(lastNotFound)) throw createVipGateError(404, lastNotFound)
    throw landNotFoundError()
  } catch (error) {
    if (isVipGateError(error)) throw error
    if (error.message.includes('fetch') || error.name === 'TypeError') {
      throw new Error('Network error. Please check your connection and try again.')
    }
    throw error
  }
}
