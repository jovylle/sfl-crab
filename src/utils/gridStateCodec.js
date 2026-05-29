// src/utils/gridStateCodec.js
// Utility for encoding/decoding grid state for sharing

import { landDiggingPath } from '@/utils/landRoutes.js'

const VERSION = 1

/** Count user-placed marks (excludes auto near-/actual- hints). */
export function countCustomMarks (gridManager) {
  if (!gridManager?.tiles?.value) return 0
  let count = 0
  for (const tileClasses of gridManager.tiles.value) {
    if (!tileClasses?.length) continue
    if (
      tileClasses.some(
        cls =>
          cls.startsWith('hint-') &&
          !cls.includes('near-') &&
          !cls.includes('actual-')
      )
    ) {
      count += 1
    }
  }
  return count
}

/**
 * Encode grid state to a compressed string for sharing
 * @param {Object} gridManager - The grid manager instance
 * @param {string} landId - Current land ID
 * @returns {string} - Compressed base64 string
 */
export function encodeGridState(gridManager, landId) {
  try {
    const state = {
      v: VERSION,
      landId: landId || 'guest',
      marks: {},
      timestamp: Date.now()
    }

    // Extract marks from grid manager
    if (gridManager && gridManager.tiles) {
      gridManager.tiles.value.forEach((tileClasses, index) => {
        if (tileClasses && tileClasses.length > 0) {
          // Only include custom hints (not auto-generated ones)
          const customHints = tileClasses.filter(cls => 
            cls.startsWith('hint-') && 
            !cls.includes('near-') && 
            !cls.includes('actual-')
          )
          if (customHints.length > 0) {
            state.marks[index] = customHints
          }
        }
      })
    }

    // Convert to JSON and compress with base64
    const jsonString = JSON.stringify(state)
    const compressed = btoa(unescape(encodeURIComponent(jsonString)))
    
    return compressed
  } catch (error) {
    console.error('Failed to encode grid state:', error)
    throw new Error('Failed to encode grid state')
  }
}

/**
 * Decode grid state from a compressed string
 * @param {string} encodedState - Compressed base64 string
 * @returns {Object} - Decoded state object
 */
export function decodeGridState(encodedState) {
  try {
    // Decode from base64
    const jsonString = decodeURIComponent(escape(atob(encodedState)))
    const state = JSON.parse(jsonString)

    // Validate version
    if (state.v !== VERSION) {
      throw new Error(`Unsupported version: ${state.v}. Expected: ${VERSION}`)
    }

    // Validate required fields
    if (!state.marks || typeof state.marks !== 'object') {
      throw new Error('Invalid state: missing marks object')
    }

    return state
  } catch (error) {
    console.error('Failed to decode grid state:', error)
    throw new Error('Invalid grid state data')
  }
}

/**
 * Overlay shared marks on the current grid (keeps digs / sand state).
 * @param {Object} state - Decoded state object
 * @param {Object} gridManager - The grid manager instance
 * @returns {number} - Count of marks applied
 */
export function applySharedMarks (state, gridManager) {
  if (!gridManager?.pick || !state?.marks) return 0

  let count = 0
  for (const [indexStr, classes] of Object.entries(state.marks)) {
    const index = parseInt(indexStr, 10)
    if (Number.isNaN(index) || !Array.isArray(classes) || !classes.length) continue
    gridManager.pick(index, classes[0])
    count += 1
  }
  return count
}

/** @deprecated Use applySharedMarks — clears grid first */
export function importMarksToGrid (state, gridManager) {
  try {
    if (!gridManager?.pick) throw new Error('Invalid grid manager')
    gridManager.clear()
    return applySharedMarks(state, gridManager) > 0
  } catch (error) {
    console.error('Failed to import marks:', error)
    return false
  }
}

/**
 * Generate a shareable URL with grid state
 * @param {string} encodedState - Encoded grid state
 * @param {string} baseUrl - Base URL (defaults to current origin)
 * @returns {string} - Shareable URL
 */
export function generateShareableUrl (encodedState, landId, baseUrl = window.location.origin) {
  const id = String(landId || 'guest')
  const rel = landDiggingPath(id !== 'guest' ? id : null)
  const url = new URL(rel, baseUrl)
  url.searchParams.set('marks', encodedState)
  return url.toString()
}

/**
 * Extract grid state from URL parameters
 * @param {string} url - URL to extract from (defaults to current URL)
 * @returns {string|null} - Encoded state or null if not found
 */
export function extractStateFromUrl (url = window.location.href) {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('marks') || urlObj.searchParams.get('grid')
  } catch (error) {
    console.error('Failed to extract state from URL:', error)
    return null
  }
}

/**
 * Copy text to clipboard with user feedback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Validate if a string looks like a valid encoded grid state
 * @param {string} str - String to validate
 * @returns {boolean} - Whether it looks valid
 */
export function isValidEncodedState(str) {
  if (!str || typeof str !== 'string') return false
  
  try {
    // Try to decode it
    decodeGridState(str)
    return true
  } catch {
    return false
  }
}
