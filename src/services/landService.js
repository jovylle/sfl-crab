// src/services/landService.js

const STORAGE_KEY = 'landData'

export function saveLandData (data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getLandData () {
  const raw = localStorage.getItem(STORAGE_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    console.error('Corrupt landData in localStorage')
    return null
  }
}

export function clearLandData () {
  localStorage.removeItem(STORAGE_KEY)
}
