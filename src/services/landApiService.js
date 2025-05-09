// File: src/services/landApiService.js

/**
 * Fetches land data from the backend API for the given landID.
 * @param {string} landId
 * @returns {Promise<Object>} the parsed JSON payload
 */
export async function fetchLandDataFromServer (landId) {
  if (!landId) throw new Error('landId is required');
  const response = await fetch(`/api/visit/${landId}`);
  if (!response.ok) throw new Error('Failed to fetch land data.');
  return await response.json();
}
