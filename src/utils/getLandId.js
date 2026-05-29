// src/utils/getLandId.js
export function getLandIdFromUrl (pathname = window.location.pathname) {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments[0] === 'test') {
    return /^\d+$/.test(segments[1]) ? segments[1] : ''
  }
  return /^\d+$/.test(segments[0]) ? segments[0] : ''
}
