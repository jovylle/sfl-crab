const PRACTICE_PATTERN_ENDPOINT = '/api/practice-patterns'
const getTodayUTC = () => new Date().toISOString().slice(0, 10)
const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeUTCDate (value) {
  return typeof value === 'string' && UTC_DATE_PATTERN.test(value) ? value : ''
}

function normalizePracticePayload (data, responseDate = '') {
  const date = normalizeUTCDate(data?.date) || normalizeUTCDate(responseDate)

  if (!data) {
    return { date, visitedFarmState: {} }
  }

  if (data.visitedFarmState) {
    return {
      ...data,
      date,
    }
  }

  if (data.farm) {
    return {
      ...data,
      date,
      visitedFarmState: data.farm,
    }
  }

  return {
    date,
    visitedFarmState: data,
  }
}

export async function fetchPracticePatterns (utcDate = getTodayUTC()) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(PRACTICE_PATTERN_ENDPOINT, baseUrl)
  url.searchParams.set('utcDate', utcDate)
  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || "Failed to fetch today's practice patterns.")
  }

  const payload = await response.json()
  return normalizePracticePayload(payload, response.headers.get('x-pattern-date') || '')
}
