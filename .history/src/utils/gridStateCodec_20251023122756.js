// src/utils/gridStateCodec.js
// Utility for encoding/decoding grid state for sharing

const VERSION = 1

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
 * Import marks from decoded state into grid manager
 * @param {Object} state - Decoded state object
 * @param {Object} gridManager - The grid manager instance
 * @returns {boolean} - Success status
 */
export function importMarksToGrid(state, gridManager) {
  try {
    if (!gridManager || !gridManager.pick) {
      throw new Error('Invalid grid manager')
    }

    // Clear existing custom marks first
    gridManager.clear()

    // Apply imported marks
    Object.entries(state.marks).forEach(([indexStr, classes]) => {
      const index = parseInt(indexStr, 10)
      if (!isNaN(index) && Array.isArray(classes) && classes.length > 0) {
        // Apply the first class (grid manager expects single class)
        gridManager.pick(index, classes[0])
      }
    })

    return true
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
export function generateShareableUrl(encodedState, baseUrl = window.location.origin) {
  const url = new URL(baseUrl)
  url.pathname = '/digging'
  url.searchParams.set('grid', encodedState)
  return url.toString()
}

/**
 * Extract grid state from URL parameters
 * @param {string} url - URL to extract from (defaults to current URL)
 * @returns {string|null} - Encoded state or null if not found
 */
export function extractStateFromUrl(url = window.location.href) {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('grid')
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
