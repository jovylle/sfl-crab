export async function fetchDesertData(landId) {
  const response = await fetch(`/api/visit/${landId}`)
  if (!response.ok) throw new Error('Failed to fetch data.')
  const data = await response.json()
  return data.state.desert // Extract the desert property
}