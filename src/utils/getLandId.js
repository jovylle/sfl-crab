// src/utils/getLandId.js
import { TEST_PATH_PREFIX } from '@/utils/landRoutes.js'

export function getLandIdFromUrl (pathname = window.location.pathname) {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments[0] === TEST_PATH_PREFIX) {
    return /^\d+$/.test(segments[1]) ? segments[1] : ''
  }
  return /^\d+$/.test(segments[0]) ? segments[0] : ''
}
