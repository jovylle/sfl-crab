
// src/utils/storageHelpers.js
export function getLocalStoredLandData(landId) {
  const key = `landData_${landId}`
  const raw = localStorage.getItem(key)
  // console.log(`🔑 getLocalStoredLandData key="${key}" raw=`, raw)
  try {
    return raw ? JSON.parse(raw) : null
  } catch(e) {
    console.error('❌ JSON.parse error for landData:', e)
    return null
  }
}

export function setLocalStoredLandData (landID, data) {
  if (!landID) return;
  try {
    localStorage.setItem(`landData_${landID}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to store landData for ${landID}:`, e);
  }
}

export function removeLocalStoredLandData (landID) {
  if (!landID) return;
  localStorage.removeItem(`landData_${landID}`);
}