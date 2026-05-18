import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  buildDigTimeline,
  buildDigStats,
  getCurrentDigOrder,
  getTodayUTC,
} from '@/utils/buildDigTimeline.js'
import { useMarkJournal, getMarkEventsSnapshot } from '@/composables/useMarkJournal.js'
import { registerMarkJournalHandlers } from '@/composables/markJournalBridge.js'
import { fetchDigDay, saveDigDay } from '@/services/digDayApiService.js'

const instances = new Map()
const SYNC_DEBOUNCE_MS = 400

function isPersistableLandId (landId) {
  const id = String(landId || '')
  return id && id !== 'guest' && id !== '0' && /^\d+$/.test(id)
}

const noopStore = {
  syncStatus: ref('idle'),
  lastUpdatedAt: ref(null),
  loadFromServer: async () => {},
  scheduleSync: () => {},
  upsertFromApi: () => {},
}

/**
 * Per landId + UTC date: sync lean dig snapshot to Netlify Blobs (public, no ownership v1).
 * @param {string} landId
 * @param {import('vue').Ref | (() => object)} desertSource reactive desert or getter
 */
export function useDigDayStore (landId, desertSource) {
  const key = String(landId || '')
  if (!isPersistableLandId(key)) return noopStore

  if (!instances.has(key)) {
    const journal = useMarkJournal(key)
    const syncStatus = ref('idle')
    const lastUpdatedAt = ref(null)
    let syncTimer = null
    let lastPayloadJson = ''

    function getDesert () {
      const src = desertSource
      if (typeof src === 'function') return src() || {}
      return src?.value ?? src ?? {}
    }

    function buildPayload () {
      const digging = getDesert().digging || {}
      const rawGrid = digging.grid || []
      const digs = buildDigTimeline(rawGrid)

      return {
        v: 1,
        landId: key,
        utcDate: getTodayUTC(),
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
      try {
        const remote = await fetchDigDay(key, getTodayUTC())
        if (remote?.markEvents?.length) {
          journal.mergeServerEvents(remote.markEvents)
        }
        if (remote?.updatedAt) {
          lastUpdatedAt.value = remote.updatedAt
        }
        syncStatus.value = 'idle'
      } catch (err) {
        console.warn('dig-day load failed:', err)
        syncStatus.value = 'error'
      }
    }

    async function syncToServer () {
      const payload = buildPayload()
      const json = JSON.stringify(payload)
      if (json === lastPayloadJson) return

      syncStatus.value = 'syncing'
      try {
        const saved = await saveDigDay(payload)
        lastPayloadJson = json
        if (saved?.markEvents?.length) {
          journal.mergeServerEvents(saved.markEvents)
        }
        lastUpdatedAt.value = saved?.updatedAt || payload.updatedAt
        syncStatus.value = 'saved'
      } catch (err) {
        console.warn('dig-day sync failed:', err)
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
      { deep: true }
    )

    watch(
      () => journal.events.value.length,
      () => scheduleSync()
    )

    const store = {
      syncStatus,
      lastUpdatedAt,
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
