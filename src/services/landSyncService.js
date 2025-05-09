// File: src/services/landSyncService.js
import { fetchLandDataFromServer } from '@/services/landApiService';
import { setLocalStoredLandData } from '@/utils/storageHelpers';

/**
 * Fetches fresh data from the server and writes into localStorage.
 * Does NOT broadcast—caller must reload via `useLandData().reload()`.
 */
export async function syncLandDataFromServerToLocalStorage (landID) {
  if (!landID) throw new Error('landID is required');
  const freshData = await fetchLandDataFromServer(landID);
  setLocalStoredLandData(landID, freshData);
  return freshData;
}
