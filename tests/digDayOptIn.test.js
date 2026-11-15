// Dig-day Hub sync is opt-in per land. These tests guard the network contract:
// off (the default) means no GET and no POST; on means the old behaviour
// (initial GET, 30s debounce, flush on hide); the choice persists per land.

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'

const lifecycle = vi.hoisted(() => ({ mounted: [], unmounted: [] }))
const api = vi.hoisted(() => ({
  fetchDigDay: vi.fn(),
  saveDigDay: vi.fn(),
}))
const journal = vi.hoisted(() => ({
  events: [],
  mergeServerEvents: vi.fn(),
}))

vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal()),
  onMounted: (fn) => lifecycle.mounted.push(fn),
  onBeforeUnmount: (fn) => lifecycle.unmounted.push(fn),
}))

vi.mock('@/services/digDayApiService.js', () => ({
  DigDayApiError: class DigDayApiError extends Error {},
  fetchDigDay: api.fetchDigDay,
  saveDigDay: api.saveDigDay,
}))

vi.mock('@/composables/useMarkJournal.js', () => ({
  useMarkJournal: () => ({
    mergeServerEvents: journal.mergeServerEvents,
    recordSet: vi.fn(),
    recordClear: vi.fn(),
    recordClearAll: vi.fn(),
  }),
  getMarkEventsSnapshot: () => journal.events,
}))

vi.mock('@/composables/useHubSession.js', () => ({
  getHubDisplayName: () => undefined,
}))

vi.mock('@/config/api.js', () => ({ isTestApiEnvironment: () => false }))

import { useDigDayStore } from '@/composables/useDigDayStore.js'
import { getMarkJournalHandlers } from '@/composables/markJournalBridge.js'
import { digDaySyncKey, STORAGE_KEYS, STORAGE_AUDIENCE } from '@/constants/storageKeys.js'
import DigDaySyncToggle from '@/components/DigDaySyncToggle.vue'

const DEBOUNCE_MS = 30_000

function installBrowserStubs () {
  const data = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  })
  const docListeners = {}
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type, fn) => { docListeners[type] = fn },
    removeEventListener: (type) => { delete docListeners[type] },
  })
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  return { data, docListeners }
}

/** One dug tile, so the payload has a non-empty digs timeline. */
function makeDesert (tiles = 1) {
  const grid = []
  for (let i = 0; i < tiles; i += 1) {
    grid.push({ x: i, y: 0, items: { Sand: 1 }, dugAt: 1_700_000_000_000 + i })
  }
  return { digging: { patterns: ['HIEROGLYPH'], grid } }
}

let nextLand = 1000
function freshLandId () {
  nextLand += 1
  return String(nextLand)
}

/** Create a store as a component would, and run its mounted hooks. */
async function mountStore (landId, desert = makeDesert()) {
  lifecycle.mounted.length = 0
  lifecycle.unmounted.length = 0
  const store = useDigDayStore(landId, () => desert)
  const mounted = [...lifecycle.mounted]
  const unmounted = [...lifecycle.unmounted]
  for (const fn of mounted) fn()
  await vi.advanceTimersByTimeAsync(0)
  return { store, unmount: () => unmounted.forEach((fn) => fn()) }
}

describe('dig-day opt-in sync', () => {
  let stubs
  let landId
  let desert

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubs = installBrowserStubs()
    api.fetchDigDay.mockReset().mockResolvedValue({ markEvents: [] })
    api.saveDigDay.mockReset().mockResolvedValue({ updatedAt: '2026-11-15T00:00:00.000Z' })
    journal.events = []
    journal.mergeServerEvents.mockReset()
    landId = freshLandId()
    desert = makeDesert()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to off and makes no network calls on mount', async () => {
    const { store, unmount } = await mountStore(landId, desert)
    expect(store.canSync).toBe(true)
    expect(store.syncEnabled.value).toBe(false)
    expect(store.syncStatus.value).toBe('idle')
    expect(api.fetchDigDay).not.toHaveBeenCalled()
    expect(api.saveDigDay).not.toHaveBeenCalled()
    unmount()
  })

  it('stays silent when marks change, the debounce elapses and the tab is hidden', async () => {
    const { store, unmount } = await mountStore(landId, desert)
    getMarkJournalHandlers(landId).onPick(3, 'some-hint')
    store.scheduleSync()
    store.upsertFromApi()
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2)
    document.visibilityState = 'hidden'
    stubs.docListeners.visibilitychange()
    unmount()
    expect(api.fetchDigDay).not.toHaveBeenCalled()
    expect(api.saveDigDay).not.toHaveBeenCalled()
  })

  it('does the initial GET on mount when the land was opted in earlier', async () => {
    stubs.data.set(digDaySyncKey(landId), '1')
    const { store, unmount } = await mountStore(landId, desert)
    expect(store.syncEnabled.value).toBe(true)
    expect(api.fetchDigDay).toHaveBeenCalledTimes(1)
    expect(api.fetchDigDay.mock.calls[0][0]).toBe(landId)
    // Hydration seeds the fingerprint, so an opted-in reload does not re-POST.
    expect(api.saveDigDay).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps the 30s debounce once on', async () => {
    stubs.data.set(digDaySyncKey(landId), '1')
    const { unmount } = await mountStore(landId, desert)
    desert.digging.grid.push({ x: 5, y: 5, items: { Sand: 1 }, dugAt: 1_700_000_999_999 })
    getMarkJournalHandlers(landId).onPick(3, 'some-hint')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1000)
    expect(api.saveDigDay).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.saveDigDay).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('flushes a dirty day when the tab is hidden once on', async () => {
    stubs.data.set(digDaySyncKey(landId), '1')
    const { unmount } = await mountStore(landId, desert)
    desert.digging.grid.push({ x: 6, y: 6, items: { Sand: 1 }, dugAt: 1_700_000_888_888 })
    document.visibilityState = 'hidden'
    stubs.docListeners.visibilitychange()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.saveDigDay).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('turning on fetches, merges, then pushes the current local state', async () => {
    api.fetchDigDay.mockResolvedValue({
      markEvents: [{ seq: 1 }],
      updatedAt: '2026-11-15T00:00:00.000Z',
    })
    const { store, unmount } = await mountStore(landId, desert)
    await store.setSyncEnabled(true)
    expect(store.syncEnabled.value).toBe(true)
    expect(stubs.data.get(digDaySyncKey(landId))).toBe('1')
    expect(api.fetchDigDay).toHaveBeenCalledTimes(1)
    expect(journal.mergeServerEvents).toHaveBeenCalledWith([{ seq: 1 }])
    expect(api.saveDigDay).toHaveBeenCalledTimes(1)
    expect(api.saveDigDay.mock.calls[0][0].digs).toHaveLength(1)
    expect(api.fetchDigDay.mock.invocationCallOrder[0])
      .toBeLessThan(api.saveDigDay.mock.invocationCallOrder[0])
    expect(store.syncStatus.value).toBe('saved')
    unmount()
  })

  it('does not POST on turning on when there is nothing local to share', async () => {
    const empty = { digging: { patterns: [], grid: [] } }
    const { store, unmount } = await mountStore(landId, empty)
    await store.setSyncEnabled(true)
    expect(api.fetchDigDay).toHaveBeenCalledTimes(1)
    expect(api.saveDigDay).not.toHaveBeenCalled()
    unmount()
  })

  it('turning off cancels the pending timer and sends nothing further', async () => {
    stubs.data.set(digDaySyncKey(landId), '1')
    const { store, unmount } = await mountStore(landId, desert)
    desert.digging.grid.push({ x: 7, y: 7, items: { Sand: 1 }, dugAt: 1_700_000_777_777 })
    getMarkJournalHandlers(landId).onPick(3, 'some-hint')
    await store.setSyncEnabled(false)
    expect(store.syncEnabled.value).toBe(false)
    expect(stubs.data.has(digDaySyncKey(landId))).toBe(false)
    expect(store.syncStatus.value).toBe('idle')

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2)
    document.visibilityState = 'hidden'
    stubs.docListeners.visibilitychange()
    unmount()
    expect(api.saveDigDay).not.toHaveBeenCalled()
    expect(api.fetchDigDay).toHaveBeenCalledTimes(1)
  })

  it('ignores a save that finishes after turning off', async () => {
    let resolveSave
    api.saveDigDay.mockImplementation(() => new Promise((r) => { resolveSave = r }))
    const { store, unmount } = await mountStore(landId, desert)
    const turningOn = store.setSyncEnabled(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(store.syncStatus.value).toBe('syncing')
    await store.setSyncEnabled(false)
    resolveSave({ updatedAt: '2026-11-15T00:00:00.000Z' })
    await turningOn
    expect(store.syncStatus.value).toBe('idle')
    unmount()
  })

  it('stores the preference per land', async () => {
    const other = freshLandId()
    const a = await mountStore(landId, desert)
    const b = await mountStore(other, desert)
    await a.store.setSyncEnabled(true)
    expect(stubs.data.get(digDaySyncKey(landId))).toBe('1')
    expect(stubs.data.has(digDaySyncKey(other))).toBe(false)
    expect(b.store.syncEnabled.value).toBe(false)
    a.unmount()
    b.unmount()
  })

  it('gives guest and non-numeric ids a no-op store with no toggle', async () => {
    for (const id of ['guest', '0', '', 'abc']) {
      const store = useDigDayStore(id, () => desert)
      expect(store.canSync).toBe(false)
      await store.setSyncEnabled(true)
      expect(store.syncEnabled.value).toBe(false)
    }
    expect(api.fetchDigDay).not.toHaveBeenCalled()
    expect(api.saveDigDay).not.toHaveBeenCalled()
    expect(stubs.data.size).toBe(0)
  })
})

describe('dig-day sync storage key', () => {
  it('is per land and registered with audience metadata', () => {
    expect(digDaySyncKey('123')).toBe('digDaySync-123')
    expect(digDaySyncKey('456')).not.toBe(digDaySyncKey('123'))
    expect(STORAGE_KEYS.DIG_DAY_SYNC.audience).toBe(STORAGE_AUDIENCE.GUEST_OR_SIGNED_IN)
  })
})

describe('DigDaySyncToggle', () => {
  function render (props) {
    return renderToString(createSSRApp({ render: () => h(DigDaySyncToggle, props) }))
  }

  it('renders an unchecked, labelled toggle by default', async () => {
    const html = await render({})
    expect(html).toContain('Save and share this day')
    expect(html).not.toContain('checked')
    expect(html).not.toContain('Open shared day')
  })

  it('shows status and the shared link when on', async () => {
    const html = await render({
      enabled: true,
      status: 'saved',
      replayUrl: 'https://hub.example/dig/1',
    })
    expect(html).toContain('checked')
    expect(html).toContain('Saved')
    expect(html).toContain('href="https://hub.example/dig/1"')
  })

  it('shows the error message on failure and hides status while off', async () => {
    const on = await render({ enabled: true, status: 'error', error: 'Hub down' })
    expect(on).toContain('Hub down')
    const off = await render({ enabled: false, status: 'error', error: 'Hub down' })
    expect(off).not.toContain('Hub down')
  })

  it('nudges signed-in Hub users while sync is off', async () => {
    const html = await render({ signedIn: true })
    expect(html).toContain('signed in to the Hub')
    expect(html).toContain('border-primary')
  })
})
