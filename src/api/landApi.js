export async function fetchLandData (landId) {
  const response = await fetch(`/api/visit/${landId}`)
  if (!response.ok) throw new Error('Failed to fetch land data.')
  const data = await response.json()
  return data
}
