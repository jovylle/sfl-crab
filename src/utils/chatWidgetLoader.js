// src/utils/chatWidgetLoader.js
// Waits for landData, then boots ProjectMate embed.js without floating launcher.

import { getLandDataStorageKey } from '@/config/api.js'

const PROJECT_CHANGELOG = [
  {
    version: '2026.05',
    date: '2026-05-27',
    bullets: [
      'Added public practice-run sharing with stable replay links.',
      'Enabled exact-grid replay for saved runs.',
      'Improved auth flow with guest-first passwordless Hub sign-in.',
    ],
  },
  {
    version: '2026.04',
    date: '2026-04-29',
    bullets: [
      'Synced testnet dig-day saves with hidden land ID routing.',
      'Fixed /api/practice-run redirects and practice-run proxy headers.',
      'Cleaned replay submission mapping to avoid unsupported formations.',
    ],
  },
  {
    version: '2026.03',
    date: '2026-03-18',
    bullets: [
      'Submitted practice scores to the Hub with optional dig-day display names.',
      'Added secure /admin page backed by Netlify Blobs.',
      'Updated hub replay links to use /dig/ paths.',
    ],
  },
  {
    version: '2026.02',
    date: '2026-02-06',
    bullets: [
      'Moved testnet routing to query-flag mode for shareable URLs.',
      'Simplified test API controls in the main menu.',
      'Fixed bare ?testnet handling when query params are omitted by router.',
    ],
  },
]

export function initChatWidget () {
  let hasInitialized = false
  const EMBED_SRC = 'https://projectmate.uft1.com/embed.js'
  const APP_URL =
    import.meta.env?.VITE_PROJECTMATE_APP_URL ||
    'https://projectmate.uft1.com/overlay/'
  const PROJECT_ID =
    import.meta.env?.VITE_PROJECTMATE_PROJECT_ID || 'sfl-crab'
  const ISSUES_ENDPOINT = import.meta.env?.VITE_PROJECTMATE_ISSUES_ENDPOINT
  const WEB3FORMS_ACCESS_KEY = import.meta.env?.VITE_PROJECTMATE_WEB3FORMS_KEY

  function setProjectMateReady (ready) {
    window.dispatchEvent(
      new CustomEvent('projectmate:ready', {
        detail: { ready: Boolean(ready) },
      })
    )
  }

  function buildProjectMateConfig () {
    const config = {
      projectId: PROJECT_ID,
      appUrl: APP_URL,
      about: {
        title: 'SFL Crab (d1g.uk)',
        description: 'SFL Crab is a Sunflower Land Desert Digging Assistant that helps players track dug tiles, detect hints, preview daily treasure patterns, and practice optimal digging routes with shareable runs.',
      },
      changelog: PROJECT_CHANGELOG,
      links: {
        website: 'https://d1g.uk',
        mirror: 'https://sfl.uft1.com',
        github: 'https://github.com/jovylle/sfl-crab',
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

    if (ISSUES_ENDPOINT) {
      config.issuesEndpoint = ISSUES_ENDPOINT
    }

    if (WEB3FORMS_ACCESS_KEY) {
      config.web3forms = {
        accessKey: WEB3FORMS_ACCESS_KEY,
        subject: 'SFL Crab feedback',
        fromName: 'd1g.uk',
      }
    }

    return config
  }

  function bootProjectMate () {
    if (!window.ProjectMate || typeof window.ProjectMate.init !== 'function') {
      setProjectMateReady(false)
      return
    }

    window.ProjectMate.init(buildProjectMateConfig())
    setProjectMateReady(typeof window.ProjectMate.open === 'function')
  }

  function onDataReady () {
    if (hasInitialized) return

    if (window.ProjectMate && typeof window.ProjectMate.init === 'function') {
      bootProjectMate()
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
    s.addEventListener('load', () => bootProjectMate())
    s.addEventListener('error', () => setProjectMateReady(false))
    document.body.appendChild(s)
    hasInitialized = true
  }

  // Listen for your event
  window.addEventListener('landDataReady', e => onDataReady(e.detail))

  // Option B: fallback polling if we don’t emit the event
  ;(function pollStorage () {
    // derive the same key your app uses
    const landId = window.SFL_LAND_ID || 1
    const key = getLandDataStorageKey(landId)
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
