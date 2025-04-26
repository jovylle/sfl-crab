// src/utils/getLandId.js
export function getLandIdFromUrl () {
  // e.g. “/3909011227428687” → “3909011227428687”
  const raw = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return /^\d+$/.test(raw) ? raw : ''
}
