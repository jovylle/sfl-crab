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
  
  // Simple helper for immediate use (non-reactive)
  const getImageSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc
    
    // Trigger retry in background but return original immediately
    retryImageLoad(originalSrc).catch(() => {
      // Silently handle errors - the img tag will show broken image
    })
    
    return originalSrc
  }
  
  return {
    getReliableImageSrc,
    getImageSrc,
    loadingImages: computed(() => loadingImages.value)
  }
}
