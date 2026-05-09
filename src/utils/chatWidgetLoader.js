// src/utils/chatWidgetLoader.js
// Waits for landData, then boots ProjectMate embed.js without floating launcher.

export function initChatWidget () {
  let hasInitialized = false
  const EMBED_SRC = 'https://projectmate.uft1.com/embed.js'
  const APP_URL = 'https://projectmate.uft1.com/overlay/'

  function setProjectMateReady (ready) {
    window.dispatchEvent(
      new CustomEvent('projectmate:ready', {
        detail: { ready: Boolean(ready) },
      })
    )
  }

  function buildProjectMateConfig ({ desertDigging, username }) {
    const patterns = Array.isArray(desertDigging?.patterns) ? desertDigging.patterns : []
    const grid = Array.isArray(desertDigging?.grid) ? desertDigging.grid : []
    const safeUsername = typeof username === 'string' && username.trim() ? username.trim() : 'player'

    const patternText = patterns.length ? patterns.join(', ') : 'none available'
    const gridCount = grid.length

    return {
      projectId: 'sfl-crab',
      appUrl: APP_URL,
      about: {
        title: 'SFL Digging Assistant',
        description: `Hi ${safeUsername}. Patterns: ${patternText}. Dug tiles: ${gridCount}.`,
      },
      features: {
        chat: false,
        feedback: true,
        updates: true,
        issues: false,
        about: true,
      },
      theme: 'auto',
      accentColor: '#4f46e5',
      launcher: {
        hidden: true,
      },
    }
  }

  function bootProjectMate (data) {
    if (!window.ProjectMate || typeof window.ProjectMate.init !== 'function') {
      setProjectMateReady(false)
      return
    }

    window.ProjectMate.init(buildProjectMateConfig(data))
    setProjectMateReady(typeof window.ProjectMate.open === 'function')
  }

  function onDataReady ({ desertDigging, username }) {
    if (hasInitialized) return
    const data = { desertDigging, username }

    if (window.ProjectMate && typeof window.ProjectMate.init === 'function') {
      bootProjectMate(data)
      hasInitialized = true
      return
    }

    // Inject ProjectMate embed script once.
    if (document.querySelector(`script[src="${EMBED_SRC}"]`)) {
      hasInitialized = true
      return
    }

    const s = document.createElement('script')
    s.src = EMBED_SRC
    s.defer = true
    s.dataset.projectmateEmbed = 'true'
    s.addEventListener('load', () => bootProjectMate(data))
    s.addEventListener('error', () => setProjectMateReady(false))
    document.body.appendChild(s)
    hasInitialized = true
  }

  // Listen for your event
  window.addEventListener('landDataReady', e => onDataReady(e.detail))
  // Option B: fallback polling if we don’t emit the event
  (function pollStorage () {
    // derive the same key your app uses
    const landId = window.SFL_LAND_ID || 1
    const key = `landData_${landId}`
    const raw = localStorage.getItem(key)

    if (raw) {
      try {
        const data = JSON.parse(raw)
        onDataReady(data)
      } catch {
        // if it’s still not valid JSON, try again shortly
        return setTimeout(pollStorage, 100)
      }
    } else {
      setTimeout(pollStorage, 100)
    }
  })()

}
