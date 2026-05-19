const SESSION_KEY = 'sfl-api-dev-menu-unlocked'

/** Dev-only: reveal API server controls in the side menu for this browser tab session. */
export function isApiDevMenuUnlocked () {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockApiDevMenu () {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
    window.dispatchEvent(new CustomEvent('sfl-api-dev-menu-unlocked'))
  } catch {
    /* ignore */
  }
}

/** `?api=test` or `?api=dev` on any page unlocks controls (query stripped after). */
export function unlockApiDevMenuFromQuery (query) {
  const v = String(query?.api || '').toLowerCase()
  if (v === 'test' || v === 'dev') {
    unlockApiDevMenu()
    return true
  }
  return false
}
