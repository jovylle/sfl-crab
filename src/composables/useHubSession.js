import { ref, computed } from 'vue'
import {
  HUB_SESSION_KEY,
  HUB_USER_KEY,
  HUB_DISPLAY_NAME_KEY,
  HUB_ANONYMOUS_ID_KEY,
  PRACTICE_NICKNAME_KEY,
} from '@/constants/storageKeys.js'
import {
  fetchMe,
  logoutOnHub,
  HubAuthError,
} from '@/services/hubAuthService.js'

const token = ref(null)
const user = ref(null)
const bootstrapped = ref(false)

export function readHubAnonymousId () {
  if (typeof localStorage === 'undefined') return null
  let id = localStorage.getItem(HUB_ANONYMOUS_ID_KEY)
  if (!id && typeof crypto !== 'undefined' && crypto.randomUUID) {
    id = crypto.randomUUID()
    localStorage.setItem(HUB_ANONYMOUS_ID_KEY, id)
  }
  return id
}

function loadFromStorage () {
  if (typeof localStorage === 'undefined') return
  token.value = localStorage.getItem(HUB_SESSION_KEY) || null
  const raw = localStorage.getItem(HUB_USER_KEY)
  if (raw) {
    try {
      user.value = JSON.parse(raw)
    } catch {
      user.value = null
    }
  } else {
    user.value = null
  }
}

function migrateLegacyNickname () {
  if (typeof localStorage === 'undefined') return
  const legacy = localStorage.getItem(PRACTICE_NICKNAME_KEY)?.trim()
  const display = localStorage.getItem(HUB_DISPLAY_NAME_KEY)?.trim()
  if (legacy && !display) {
    localStorage.setItem(HUB_DISPLAY_NAME_KEY, legacy.slice(0, 64))
  }
}

/**
 * Display name for dig-day / hub payloads (guest or signed-in).
 */
export function getHubDisplayName () {
  if (typeof localStorage === 'undefined') return undefined
  const fromUser = user.value?.displayName?.trim()
  if (fromUser) return fromUser.slice(0, 64)
  const local = localStorage.getItem(HUB_DISPLAY_NAME_KEY)?.trim()
  return local ? local.slice(0, 64) : undefined
}

/**
 * @param {{ token: string, user?: object }} session
 */
export function setHubSession (session) {
  const t = session?.token?.trim()
  if (!t || typeof localStorage === 'undefined') return
  localStorage.setItem(HUB_SESSION_KEY, t)
  token.value = t
  if (session.user) {
    user.value = session.user
    localStorage.setItem(HUB_USER_KEY, JSON.stringify(session.user))
    if (session.user.displayName) {
      localStorage.setItem(
        HUB_DISPLAY_NAME_KEY,
        String(session.user.displayName).trim().slice(0, 64),
      )
    }
  }
}

export function clearHubSession () {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(HUB_SESSION_KEY)
    localStorage.removeItem(HUB_USER_KEY)
  }
  token.value = null
  user.value = null
}

export function setHubDisplayName (name) {
  const trimmed = String(name || '').trim().slice(0, 64)
  if (typeof localStorage === 'undefined') return
  if (trimmed) {
    localStorage.setItem(HUB_DISPLAY_NAME_KEY, trimmed)
  } else {
    localStorage.removeItem(HUB_DISPLAY_NAME_KEY)
  }
  if (user.value) {
    user.value = { ...user.value, displayName: trimmed || undefined }
    localStorage.setItem(HUB_USER_KEY, JSON.stringify(user.value))
  }
}

async function refreshSession () {
  if (!token.value) return null
  try {
    const me = await fetchMe(readHubAnonymousId())
    if (!me) {
      clearHubSession()
      return null
    }
    user.value = me
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HUB_USER_KEY, JSON.stringify(me))
    }
    return me
  } catch (err) {
    if (err instanceof HubAuthError && err.status === 401) {
      clearHubSession()
    }
    return null
  }
}

export function useHubSession () {
  const isAuthenticated = computed(() => Boolean(token.value))

  const accountLabel = computed(() => {
    if (!user.value) return ''
    return (
      user.value.displayName ||
      user.value.email ||
      user.value.name ||
      'Signed in'
    )
  })

  return {
    token,
    user,
    bootstrapped,
    isAuthenticated,
    accountLabel,
    anonymousId: readHubAnonymousId,
    getDisplayName: getHubDisplayName,
    setSession: setHubSession,
    setDisplayName: setHubDisplayName,
    refresh: refreshSession,
    logout: async () => {
      try {
        await logoutOnHub()
      } catch {
        /* clear locally even if hub unreachable */
      }
      clearHubSession()
    },
    loadFromStorage,
  }
}

let focusListenerAdded = false

/** Call once at app startup. */
export function initHubSession () {
  migrateLegacyNickname()
  loadFromStorage()
  readHubAnonymousId()
  bootstrapped.value = true

  if (token.value) {
    refreshSession()
  }

  if (typeof window !== 'undefined' && !focusListenerAdded) {
    focusListenerAdded = true
    window.addEventListener('focus', () => {
      if (token.value) refreshSession()
    })
  }
}
