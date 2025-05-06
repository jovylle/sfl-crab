// landService.js
export function saveLandData (data, id) {
  localStorage.setItem(`landData_${id}`, JSON.stringify(data))
}

export function getLandData (id) {
  const raw = localStorage.getItem(`landData_${id}`)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    console.error('Corrupt landData in localStorage')
    return null
  }
}

export function clearLandData (id) {
  localStorage.removeItem(`landData_${id}`)
}
