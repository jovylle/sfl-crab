import { fetchLandDataFromServer } from '@/services/landApiService'

/**
 * Pure fetch; doesn’t touch localStorage or refs.
 */
export async function fetchLandData (landId, { bypassCache = false } = {}) {
  if (!landId) throw new Error('landId is required')

  try {
    return await fetchLandDataFromServer(landId, { bypassCache })
  } catch (err) {
    // Re-throw with specific 429 message if matched
    if (err.message.includes('too quickly')) {
      throw new Error('Too many requests. Please slow down and try again shortly.')
    }
    throw err // rethrow others
  }
}
