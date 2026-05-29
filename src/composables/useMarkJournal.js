import { ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { getTodayUTC } from '@/utils/buildDigTimeline.js'

const instances = new Map()

function isTrashHint (hintClass) {
  const flat = Array.isArray(hintClass) ? hintClass : [hintClass]
  return flat.some(
    (c) =>
      c === 'no-hint-and-show-trash-icon' ||
      c === '' ||
      c == null
  )
}

function normalizeClasses (hintClass) {
  const flat = Array.isArray(hintClass) ? hintClass : [hintClass]
  return flat.filter(Boolean)
}

/**
 * Event log for custom marks (when placed relative to dig order).
 * Public data model: keyed by landId + UTC date; no ownership in v1.
 */
export function useMarkJournal (landId) {
  const key = String(landId || '')
  if (!key || key === 'guest' || key === '0') {
    return {
      events: ref([]),
      recordSet: () => {},
      recordClear: () => {},
      recordClearAll: () => {},
      mergeServerEvents: () => {},
      getMarksAtStep: () => ({}),
      nextSeq: () => 0,
    }
  }

  if (!instances.has(key)) {
    const todayUTC = getTodayUTC()
    const storageKey = `markJournal_${key}_${todayUTC}`

    const events = useStorage(storageKey, [])

    if (events.value?.length && events.value[0]?._date && events.value[0]._date !== todayUTC) {
      events.value = []
    }

    let seqCounter = Math.max(0, ...events.value.map((e) => e.seq || 0))

    function nextSeq () {
      seqCounter += 1
      return seqCounter
    }

    function recordSet (cell, classes, afterDigOrder) {
      const normalized = normalizeClasses(classes)
      if (!normalized.length || isTrashHint(classes)) {
        recordClear(cell, afterDigOrder)
        return
      }
      events.value = [
        ...events.value,
        {
          type: 'set',
          cell,
          classes: normalized,
          afterDigOrder,
          seq: nextSeq(),
          at: Date.now(),
        },
      ]
    }

    function recordClear (cell, afterDigOrder) {
      events.value = [
        ...events.value,
        {
          type: 'clear',
          cell,
          afterDigOrder,
          seq: nextSeq(),
          at: Date.now(),
        },
      ]
    }

    function recordClearAll (afterDigOrder) {
      const indices = new Set(
        events.value
          .filter((e) => e.type === 'set')
          .map((e) => e.cell)
      )
      const clears = [...indices].map((cell) => ({
        type: 'clear',
        cell,
        afterDigOrder,
        seq: nextSeq(),
        at: Date.now(),
      }))
      if (clears.length) {
        events.value = [...events.value, ...clears]
      }
    }

    function mergeServerEvents (serverEvents) {
      if (!Array.isArray(serverEvents) || !serverEvents.length) return
      const bySeq = new Map(events.value.map((e) => [e.seq, e]))
      for (const e of serverEvents) {
        if (e?.seq != null) bySeq.set(e.seq, e)
      }
      const merged = [...bySeq.values()].sort((a, b) => a.seq - b.seq)
      events.value = merged
      seqCounter = Math.max(seqCounter, ...merged.map((e) => e.seq || 0))
    }

    /**
     * Marks visible at replay step k (for future replay UI).
     * @param {number} stepOrder
     */
    function getMarksAtStep (stepOrder) {
      const active = {}
      const sorted = [...events.value].sort((a, b) => a.seq - b.seq)
      for (const e of sorted) {
        if (e.afterDigOrder > stepOrder) continue
        if (e.type === 'set') {
          active[e.cell] = e.classes
        } else if (e.type === 'clear') {
          delete active[e.cell]
        }
      }
      return active
    }

    instances.set(key, {
      events,
      recordSet,
      recordClear,
      recordClearAll,
      mergeServerEvents,
      getMarksAtStep,
      nextSeq,
    })
  }

  return instances.get(key)
}

export function getMarkEventsSnapshot (landId) {
  const j = useMarkJournal(landId)
  return [...(j.events.value || [])]
}
