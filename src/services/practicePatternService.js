const PRACTICE_PATTERN_ENDPOINT = '/api/practice-patterns'
const getTodayUTC = () => new Date().toISOString().slice(0, 10)

function normalizePracticePayload (data) {
  if (!data) {
    return { visitedFarmState: {} }
  }

  if (data.visitedFarmState) {
    return data
  }

  if (data.farm) {
    return { visitedFarmState: data.farm }
  }

  return { visitedFarmState: data }
}

export async function fetchPracticePatterns () {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(PRACTICE_PATTERN_ENDPOINT, baseUrl)
  // Keep one shared cache entry per UTC day across all users.
  url.searchParams.set('utcDate', getTodayUTC())
  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Failed to fetch today's practice patterns.")
  }

  const payload = await response.json()
  return normalizePracticePayload(payload)
}
