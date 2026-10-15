// tests/practicePatterns.test.js
//
// Guards the future-date poison chain that broke "Today's Patterns" (Oct 2026):
// a request dated "tomorrow" (fast client clock, or a seed landing before SFL's
// own rollover) used to seed tomorrow's snapshot from pre-rollover data, which
// the CDN then served all day. Three lines of defence, one test each:
//   1. client clamps requests to today    → resolvePatternRequestDate()
//   2. server clamps requests to today    → clampToToday()
//   3. store refuses to snapshot the future → createAndStoreDailySnapshot()
// Plus the rollover-window helpers that let reads heal early seeds, and the
// heal-scope guards: only today is ever healed (history must not be rewritten
// with current data) and a hollow live payload never overwrites real patterns.

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import { resolvePatternRequestDate } from '@/services/practicePatternService.js'

const require = createRequire(import.meta.url)
const {
  clampToToday,
  isProvisionalTime,
  startOfUtcDayMs,
  patternsEqual,
  createAndStoreDailySnapshot,
  revalidateProvisionalSnapshot,
  wouldErasePatterns,
} = require('../netlify/functions/_practiceDailyStore.cjs')

describe('resolvePatternRequestDate (client clamp)', () => {
  it('passes through today and past dates unchanged', () => {
    expect(resolvePatternRequestDate('2026-10-16', '2026-10-16')).toBe('2026-10-16')
    expect(resolvePatternRequestDate('2026-09-02', '2026-10-16')).toBe('2026-09-02')
  })

  it('clamps future dates to today', () => {
    expect(resolvePatternRequestDate('2026-10-17', '2026-10-16')).toBe('2026-10-16')
    expect(resolvePatternRequestDate('2099-01-01', '2026-10-16')).toBe('2026-10-16')
  })

  it('falls back to today for missing or malformed values', () => {
    expect(resolvePatternRequestDate(undefined, '2026-10-16')).toBe('2026-10-16')
    expect(resolvePatternRequestDate('', '2026-10-16')).toBe('2026-10-16')
    expect(resolvePatternRequestDate('16-10-2026', '2026-10-16')).toBe('2026-10-16')
  })
})

describe('clampToToday (server clamp)', () => {
  it('clamps future dates to today', () => {
    expect(clampToToday('2026-10-17', '2026-10-16')).toBe('2026-10-16')
  })

  it('leaves today and past dates unchanged', () => {
    expect(clampToToday('2026-10-16', '2026-10-16')).toBe('2026-10-16')
    expect(clampToToday('2026-10-01', '2026-10-16')).toBe('2026-10-01')
  })
})

describe('createAndStoreDailySnapshot future-date guard', () => {
  it('rejects a future date with 400 before touching blob storage', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await expect(createAndStoreDailySnapshot(tomorrow)).rejects.toMatchObject({
      statusCode: 400,
      payload: { error: 'future_date_not_allowed' },
    })
  })
})

describe('rollover-window helpers', () => {
  it('startOfUtcDayMs returns UTC midnight of the same day', () => {
    const ms = startOfUtcDayMs(Date.UTC(2026, 9, 16, 23, 59, 59, 999))
    expect(new Date(ms).toISOString()).toBe('2026-10-16T00:00:00.000Z')
  })

  it('isProvisionalTime is true only inside the first 15 minutes of the UTC day', () => {
    expect(isProvisionalTime(Date.UTC(2026, 9, 16, 0, 0, 0))).toBe(true)
    expect(isProvisionalTime(Date.UTC(2026, 9, 16, 0, 14, 59, 999))).toBe(true)
    expect(isProvisionalTime(Date.UTC(2026, 9, 16, 0, 15, 0, 0))).toBe(false)
    expect(isProvisionalTime(Date.UTC(2026, 9, 16, 12, 0, 0))).toBe(false)
  })

  it('patternsEqual compares by value and order, treating absent as empty', () => {
    expect(patternsEqual(['A', 'B'], ['A', 'B'])).toBe(true)
    expect(patternsEqual(['A', 'B'], ['B', 'A'])).toBe(false)
    expect(patternsEqual(['A'], ['A', 'B'])).toBe(false)
    expect(patternsEqual(undefined, [])).toBe(true)
    expect(patternsEqual(null, [])).toBe(true)
  })
})

describe('revalidateProvisionalSnapshot scope', () => {
  const PAST_DATE = '2020-01-01'

  function stubLiveFetch (patterns) {
    const originalFetch = globalThis.fetch
    const originalKey = process.env.SFL_API_KEY
    let calls = 0
    process.env.SFL_API_KEY = 'test-key'
    globalThis.fetch = async () => {
      calls += 1
      return {
        ok: true,
        json: async () => ({ visitedFarmState: { desert: { digging: { patterns } } } }),
      }
    }
    return {
      get calls () { return calls },
      restore () {
        globalThis.fetch = originalFetch
        if (originalKey === undefined) {
          delete process.env.SFL_API_KEY
        } else {
          process.env.SFL_API_KEY = originalKey
        }
      },
    }
  }

  it('never fetches live data for a past date (history must not be rewritten)', async () => {
    const stub = stubLiveFetch(['LIVE_A', 'LIVE_B'])
    try {
      const existing = { date: PAST_DATE, patterns: ['PAST_A'], provisional: true }
      const result = await revalidateProvisionalSnapshot(PAST_DATE, existing)
      expect(stub.calls).toBe(0)
      expect(result.healed).toBe(false)
      expect(result.snapshot.patterns).toEqual(['PAST_A'])
    } finally {
      stub.restore()
    }
  })

  it('still revalidates today, with no write when live matches', async () => {
    const stub = stubLiveFetch(['TODAY_A'])
    try {
      const today = new Date().toISOString().slice(0, 10)
      const existing = { date: today, patterns: ['TODAY_A'], provisional: true }
      // 00:30 into the UTC day: past the 15-min guard window, before the 2 h
      // confirm window — a live match must therefore leave the snapshot as-is.
      const nowMs = startOfUtcDayMs(Date.now()) + 30 * 60 * 1000
      const result = await revalidateProvisionalSnapshot(today, existing, nowMs)
      expect(stub.calls).toBe(1)
      expect(result.healed).toBe(false)
      expect(result.snapshot).toBe(existing)
    } finally {
      stub.restore()
    }
  })
})

describe('wouldErasePatterns (hollow live payload guard)', () => {
  it('is true when live has no patterns but the snapshot does', () => {
    expect(wouldErasePatterns([], ['A'])).toBe(true)
    expect(wouldErasePatterns(undefined, ['A'])).toBe(true)
    expect(wouldErasePatterns(null, ['A'])).toBe(true)
  })

  it('is false when live has patterns, or the snapshot is empty too', () => {
    expect(wouldErasePatterns(['A'], ['A'])).toBe(false)
    expect(wouldErasePatterns(['A'], [])).toBe(false)
    expect(wouldErasePatterns([], [])).toBe(false)
    expect(wouldErasePatterns(undefined, undefined)).toBe(false)
  })
})
