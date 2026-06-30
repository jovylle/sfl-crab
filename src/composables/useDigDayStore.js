import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  buildDigTimeline,
  buildDigStats,
  getCurrentDigOrder,
  getTodayUTC,
} from '@/utils/buildDigTimeline.js'
import { useMarkJournal, getMarkEventsSnapshot } from '@/composables/useMarkJournal.js'
import { registerMarkJournalHandlers } from '@/composables/markJournalBridge.js'
import { isTestApiEnvironment } from '@/config/api.js'
import { DigDayApiError, fetchDigDay, saveDigDay } from '@/services/digDayApiService.js'
import { isTestnetLandId } from '@/utils/testnet.js'
import { resolveHubReplayUrl } from '@/utils/hubReplayUrl.js'
import { getHubDisplayName } from '@/composables/useHubSession.js'

const instances = new Map()
/** Batch dig/mark edits before POST — longer window cuts Hub writes sharply. */
const SYNC_DEBOUNCE_MS = 30_000

function isPersistableLandId (landId) {
  const id = String(landId || '')
  return id && id !== 'guest' && id !== '0' && /^\d+$/.test(id)
}

const noopStore = {
  syncStatus: ref('idle'),
  lastUpdatedAt: ref(null),
  syncError: ref(null),
  hubReplayUrl: ref(null),
  loadFromServer: async () => {},
  scheduleSync: () => {},
  upsertFromApi: () => {},
}

/**
 * Per landId + UTC date: sync lean dig snapshot via /api/dig-day → SFL Digging Hub.
 * @param {string} landId
 * @param {import('vue').Ref | (() => object)} desertSource reactive desert or getter
 */
function shouldHideLandIdOnHub (landId) {
  return isTestApiEnvironment() || isTestnetLandId(landId)
}

export function useDigDayStore (landId, desertSource) {
  const key = String(landId || '')
  if (!isPersistableLandId(key)) return noopStore

  if (!instances.has(key)) {
    const journal = useMarkJournal(key)
    const syncStatus = ref('idle')
    const lastUpdatedAt = ref(null)
    const syncError = ref(null)
    const hubReplayUrl = ref(null)
    let syncTimer = null
    let lastSyncFingerprint = ''
    let hydrated = false

    function applyRemote (remote) {
      if (!remote) return
      if (remote.markEvents?.length) {
        journal.mergeServerEvents(remote.markEvents)
      }
      if (remote.updatedAt) {
        lastUpdatedAt.value = remote.updatedAt
      }
      const url = resolveHubReplayUrl(remote)
      if (url) hubReplayUrl.value = url
    }

    function getDesert () {
      const src = desertSource
      if (typeof src === 'function') return src() || {}
      return src?.value ?? src ?? {}
    }

    function buildSyncCore () {
      const digging = getDesert().digging || {}
      const rawGrid = digging.grid || []
      const digs = buildDigTimeline(rawGrid)
      const displayName = getHubDisplayName()

      return {
        v: 1,
        landId: key,
        utcDate: getTodayUTC(),
        ...(shouldHideLandIdOnHub(key) ? { hideLandId: true } : {}),
        ...(displayName ? { displayName } : {}),
        patterns: [...(digging.patterns || [])],
        digs,
        markEvents: getMarkEventsSnapshot(key),
      }
    }

    function buildSyncFingerprint () {
      return JSON.stringify(buildSyncCore())
    }

    function buildPayload () {
      const core = buildSyncCore()
      return {
        ...core,
        stats: buildDigStats(core.digs),
        updatedAt: new Date().toISOString(),
      }
    }

    function getGridSyncSignal () {
      const grid = getDesert().digging?.grid || []
      const timeline = buildDigTimeline(grid)
      const lastDugAt = timeline.length ? timeline[timeline.length - 1].dugAt : 0
      return `${timeline.length}:${lastDugAt}`
    }

    function getAfterDigOrder () {
      return getCurrentDigOrder(getDesert().digging?.grid || [])
    }

    registerMarkJournalHandlers(key, {
      getAfterDigOrder,
      onPick (index, hintClass) {
        const order = getAfterDigOrder()
        const flat = Array.isArray(hintClass) ? hintClass : [hintClass]
        const isClear =
          !flat.length ||
          flat.some((c) => c === 'no-hint-and-show-trash-icon' || !c)
        if (isClear) {
          journal.recordClear(index, order)
        } else {
          journal.recordSet(index, hintClass, order)
        }
        scheduleSync()
      },
      onClearAll () {
        journal.recordClearAll(getAfterDigOrder())
        scheduleSync()
      },
    })

    function seedFingerprint () {
      lastSyncFingerprint = buildSyncFingerprint()
    }

    async function loadFromServer () {
      syncStatus.value = 'loading'
      syncError.value = null
      try {
        const remote = await fetchDigDay(key, getTodayUTC())
        applyRemote(remote)
        syncStatus.value = 'idle'
      } catch (err) {
        console.warn('dig-day load failed:', err)
        syncError.value =
          err instanceof Error ? err.message : 'Failed to load dig day'
        syncStatus.value = 'error'
      } finally {
        hydrated = true
        seedFingerprint()
      }
    }

    async function syncToServer () {
      const fingerprint = buildSyncFingerprint()
      if (fingerprint === lastSyncFingerprint) return

      const payload = buildPayload()
      syncStatus.value = 'syncing'
      syncError.value = null
      try {
        const saved = await saveDigDay(payload)
        lastSyncFingerprint = fingerprint
        applyRemote(saved)
        lastUpdatedAt.value = saved?.updatedAt || payload.updatedAt
        syncStatus.value = 'saved'
      } catch (err) {
        console.warn('dig-day sync failed:', err)
        if (err instanceof DigDayApiError && err.status === 401) {
          syncError.value = 'Sign in to save dig day to your account.'
          syncStatus.value = 'auth_required'
          return
        }
        syncError.value =
          err instanceof DigDayApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Dig day sync failed'
        syncStatus.value = 'error'
      }
    }

    function scheduleSync () {
      if (!hydrated) return
      if (buildSyncFingerprint() === lastSyncFingerprint) return
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        syncTimer = null
        syncToServer()
      }, SYNC_DEBOUNCE_MS)
    }

    function flushSyncIfDirty () {
      if (!hydrated) return
      if (syncTimer) {
        clearTimeout(syncTimer)
        syncTimer = null
      }
      const fingerprint = buildSyncFingerprint()
      if (fingerprint !== lastSyncFingerprint) {
        syncToServer()
      }
    }

    function onVisibilityChange () {
      if (document.visibilityState === 'hidden') {
        flushSyncIfDirty()
      }
    }

    function upsertFromApi () {
      scheduleSync()
    }

    watch(() => getGridSyncSignal(), () => scheduleSync())

    const store = {
      syncStatus,
      lastUpdatedAt,
      syncError,
      hubReplayUrl,
      loadFromServer,
      scheduleSync,
      upsertFromApi,
      _cleanup () {
        if (syncTimer) clearTimeout(syncTimer)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('beforeunload', flushSyncIfDirty)
        registerMarkJournalHandlers(key, null)
      },
    }

    instances.set(key, store)

    onMounted(() => {
      document.addEventListener('visibilitychange', onVisibilityChange)
      window.addEventListener('beforeunload', flushSyncIfDirty)
      loadFromServer()
    })

    onBeforeUnmount(() => {
      flushSyncIfDirty()
      store._cleanup()
      instances.delete(key)
    })
  }

  return instances.get(key)
}
