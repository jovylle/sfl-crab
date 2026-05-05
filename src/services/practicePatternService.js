const PRACTICE_PATTERN_ENDPOINT = '/.netlify/functions/practice-patterns'

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
  const response = await fetch(PRACTICE_PATTERN_ENDPOINT, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Failed to fetch today's practice patterns.")
  }

  const payload = await response.json()
  return normalizePracticePayload(payload)
}
