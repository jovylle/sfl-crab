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
import { resolveHubReplayUrl } from '@/utils/hubReplayUrl.js'

const instances = new Map()
const SYNC_DEBOUNCE_MS = 400

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
export function useDigDayStore (landId, desertSource) {
  const key = String(landId || '')
  if (!isPersistableLandId(key) || isTestApiEnvironment()) return noopStore

  if (!instances.has(key)) {
    const journal = useMarkJournal(key)
    const syncStatus = ref('idle')
    const lastUpdatedAt = ref(null)
    const syncError = ref(null)
    const hubReplayUrl = ref(null)
    let syncTimer = null
    let lastPayloadJson = ''

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

    function buildPayload () {
      const digging = getDesert().digging || {}
      const rawGrid = digging.grid || []
      const digs = buildDigTimeline(rawGrid)
      const displayName =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('sfl-hub-display-name')?.trim()?.slice(0, 64) || undefined
          : undefined

      return {
        v: 1,
        landId: key,
        utcDate: getTodayUTC(),
        ...(displayName ? { displayName } : {}),
        patterns: [...(digging.patterns || [])],
        digs,
        markEvents: getMarkEventsSnapshot(key),
        stats: buildDigStats(digs),
        updatedAt: new Date().toISOString(),
      }
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
      }
    }

    async function syncToServer () {
      const payload = buildPayload()
      const json = JSON.stringify(payload)
      if (json === lastPayloadJson) return

      syncStatus.value = 'syncing'
      syncError.value = null
      try {
        const saved = await saveDigDay(payload)
        lastPayloadJson = json
        applyRemote(saved)
        lastUpdatedAt.value = saved?.updatedAt || payload.updatedAt
        syncStatus.value = 'saved'
      } catch (err) {
        console.warn('dig-day sync failed:', err)
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
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        syncTimer = null
        syncToServer()
      }, SYNC_DEBOUNCE_MS)
    }

    function upsertFromApi () {
      scheduleSync()
    }

    watch(
      () => getDesert().digging?.grid,
      () => scheduleSync(),
      { deep: true, immediate: true }
    )

    watch(
      () => journal.events.value.length,
      () => scheduleSync()
    )

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
        registerMarkJournalHandlers(key, null)
      },
    }

    instances.set(key, store)

    onMounted(() => {
      loadFromServer()
    })

    onBeforeUnmount(() => {
      store._cleanup()
      instances.delete(key)
    })
  }

  return instances.get(key)
}
