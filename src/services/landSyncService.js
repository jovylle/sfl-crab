// src/services/landSyncService.js
import { fetchLandDataFromServer } from '@/services/landApiService'

/**
 * Pure fetch; doesn’t touch localStorage or refs.
 */
export async function fetchLandData (landId) {
  if (!landId) throw new Error('landId is required')
  return fetchLandDataFromServer(landId)
}
