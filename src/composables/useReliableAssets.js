import { ref, computed } from 'vue'

// Cache for retry attempts to avoid infinite loops
const retryCache = new Map()

// Simple retry utility for images
async function retryImageLoad(src, maxRetries = 3) {
  const cacheKey = src
  
  // Check if we're already retrying this image
  if (retryCache.has(cacheKey)) {
    return retryCache.get(cacheKey)
  }
  
  const retryPromise = new Promise(async (resolve, reject) => {
    let attempts = 0
    
    const tryLoad = () => {
      attempts++
      
      const img = new Image()
      
      img.onload = () => {
        retryCache.delete(cacheKey)
        resolve(src)
      }
      
      img.onerror = () => {
        console.warn(`Image load failed (attempt ${attempts}/${maxRetries}):`, src)
        
        if (attempts < maxRetries) {
          // Exponential backoff: 500ms, 1s, 2s
          const delay = 500 * Math.pow(2, attempts - 1)
          setTimeout(tryLoad, delay)
        } else {
          retryCache.delete(cacheKey)
          console.error(`Image failed after ${maxRetries} attempts:`, src)
          // Still resolve with the original src - let the browser handle the final error
          resolve(src)
        }
      }
      
      // Add cache busting parameter on retries to force fresh request
      const retryUrl = attempts > 1 ? `${src}?retry=${attempts}&t=${Date.now()}` : src
      img.src = retryUrl
    }
    
    tryLoad()
  })
  
  retryCache.set(cacheKey, retryPromise)
  return retryPromise
}

// CSS retry utility for critical stylesheets
async function retryCssLoad(href, maxRetries = 3) {
  return new Promise(async (resolve, reject) => {
    let attempts = 0
    
    const tryLoad = () => {
      attempts++
      
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.type = 'text/css'
      
      link.onload = () => {
        console.log(`CSS loaded successfully (attempt ${attempts}):`, href)
        resolve(href)
      }
      
      link.onerror = () => {
        console.warn(`CSS load failed (attempt ${attempts}/${maxRetries}):`, href)
        
        if (attempts < maxRetries) {
          // Exponential backoff for CSS too
          const delay = 1000 * Math.pow(2, attempts - 1)
          setTimeout(tryLoad, delay)
        } else {
          console.error(`CSS failed after ${maxRetries} attempts:`, href)
          reject(new Error(`Failed to load CSS: ${href}`))
        }
      }
      
      // Add cache busting on retries
      const retryUrl = attempts > 1 ? `${href}?retry=${attempts}&t=${Date.now()}` : href
      link.href = retryUrl
      
      // Don't add to DOM - just test if it loads
      // The browser will cache it for the actual page load
    }
    
    tryLoad()
  })
}

// Auto-retry critical CSS on page load
function autoRetryCriticalAssets() {
  if (typeof window === 'undefined') return
  
  // Find all stylesheets that might have failed
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  
  stylesheets.forEach(link => {
    // Check if CSS actually loaded by testing if it has rules
    try {
      if (link.sheet && link.sheet.cssRules.length === 0) {
        console.warn('Detected potentially failed CSS, retrying:', link.href)
        retryCssLoad(link.href).catch(console.error)
      }
    } catch (e) {
      // Cross-origin or other issues - could indicate failure
      console.warn('CSS access issue, retrying:', link.href)
      retryCssLoad(link.href).catch(console.error)
    }
  })
}

export function useReliableAssets() {
  const loadingImages = ref(new Set())
  
  // Get reliable image source with retry logic
  const getReliableImageSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc
    
    // For immediate use, return original src
    // The retry happens in the background if needed
    const reliableRef = ref(originalSrc)
    
    // Start retry process in background
    if (!loadingImages.value.has(originalSrc)) {
      loadingImages.value.add(originalSrc)
      
      retryImageLoad(originalSrc).then((reliableSrc) => {
        reliableRef.value = reliableSrc
        loadingImages.value.delete(originalSrc)
      }).catch(() => {
        loadingImages.value.delete(originalSrc)
      })
    }
    
    return reliableRef
  }
  
  // Reactive image sources cache
  const imageSources = ref(new Map())
  
  // Simple helper that updates reactively when retry succeeds
  const getImageSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc
    
    // Return reactive ref for this image
    if (!imageSources.value.has(originalSrc)) {
      // Initialize with original src
      imageSources.value.set(originalSrc, ref(originalSrc))
      
      // Start retry process in background
      retryImageLoad(originalSrc).then((workingSrc) => {
        // Update the reactive ref when retry succeeds
        const imageRef = imageSources.value.get(originalSrc)
        if (imageRef && workingSrc !== originalSrc) {
          // Add cache busting to force browser to re-fetch
          imageRef.value = `${originalSrc}?t=${Date.now()}`
          console.log('Updated image src after successful retry:', originalSrc)
        }
      }).catch(() => {
        console.warn('Image retry failed completely:', originalSrc)
      })
    }
    
    return imageSources.value.get(originalSrc)
  }
  
  return {
    getReliableImageSrc,
    getImageSrc,
    loadingImages: computed(() => loadingImages.value),
    // CSS utilities
    retryCssLoad,
    autoRetryCriticalAssets
  }
}

// Call autoRetryCriticalAssets on initial load
autoRetryCriticalAssets()
