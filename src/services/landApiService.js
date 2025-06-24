export async function fetchLandDataFromServer (landId) {
  if (!landId) throw new Error('landId is required');

  const response = await fetch(`/api/visit/${landId}`);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('You are sending requests too quickly. Please wait a moment before trying again.');
    }
    throw new Error('Failed to fetch land data.');
  }

  return await response.json();
}
