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
  // Local override for dev (loopback CSP): VITE_PROJECTMATE_EMBED_SRC=http://localhost:xxxx/embed.js
  const EMBED_SRC =
    import.meta.env?.VITE_PROJECTMATE_EMBED_SRC ||
    'https://projectmate.uft1.com/embed.js'
  // Local overlay for dev: VITE_PROJECTMATE_APP_URL=http://localhost:5174/
  // (live https overlay can't fetch localhost APIs — Chrome blocks public→loopback).
  const APP_URL =
    import.meta.env?.VITE_PROJECTMATE_APP_URL ||
    'https://projectmate.uft1.com/overlay/'
  const PROJECT_ID =
    import.meta.env?.VITE_PROJECTMATE_PROJECT_ID || 'sfl-crab'
  // Same-origin proxy (Netlify function) keeps the Worker URL server-side —
  // nothing host-specific in the client bundle. Absolute URL required by schema.
  const ISSUES_ENDPOINT =
    import.meta.env?.VITE_PROJECTMATE_ISSUES_ENDPOINT ||
    `${window.location.origin}/api/projectmate`

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
        // Feedback uses FeedbackModal + Web3Forms in the browser (free plan blocks server proxy).
        feedback: false,
        updates: true,
        issues: true,
        about: true,
      },
      issuesEndpoint: ISSUES_ENDPOINT,
      theme: 'auto',
      accentColor: '#4f46e5',
      launcher: {
        hidden: true,
      },
      // Owner unlock path: #owner reveals the Review tab + passphrase prompt.
      // (Renamed from "admin" — friendlier word, same server-side key check.)
      ownerMode: { hash: 'owner' },
      autoOpen: { hash: 'owner' },
    }

    if (ISSUES_ENDPOINT) {
      config.issuesEndpoint = ISSUES_ENDPOINT
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
    // Deep-link: #owner opens the widget straight to the unlock prompt.
    try {
      if ((window.location.hash || '').replace(/^#/, '') === 'owner') {
        window.ProjectMate.open()
      }
    } catch {
      // non-fatal: user can still open via menu
    }
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

  // Boot immediately on script eval (module import), not on land data.
  // The widget is standalone (About / Updates / Feedback) — no land needed.
  // Guard StrictMode-style double-eval with a window flag.
  function bootNow () {
    if (window.__pmBooted) return
    window.__pmBooted = true
    onDataReady()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootNow, { once: true })
  } else {
    bootNow()
  }

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
