const PRACTICE_PATTERN_ENDPOINT = '/.netlify/functions/practice-patterns'

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

  return response.json()
}
