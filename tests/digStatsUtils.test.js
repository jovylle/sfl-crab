// tests/digStatsUtils.test.js
//
// Unit tests for the DigStats pure helpers (src/utils/digStatsUtils.js).
// Expectations mirror the SFL game source, not our approximation:
// - desert.ts getDailyDigLimit/getRemainingDigs (base 25 + boosts)
// - Digby.tsx getStreaks (UTC-day comparison, >1 day gap → 0)
// - collectibleBuilt.ts / wearables.ts (placed vs merely owned; equipped vs not)

import { describe, it, expect } from 'vitest'
import {
  BASE_DAILY_DIGS,
  getDailyDigMax,
  getRemainingDigs,
  getActiveStreakCount,
  getBestFindValue,
} from '@/utils/digStatsUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000

function placedCollectible (name, overrides = {}) {
  return {
    coordinates: { x: 1, y: 2 },
    readyAt: 0,
    ...overrides,
  }
}

function farmWithSurface (surfacePath, name, overrides = {}) {
  // surfacePath: array of keys from farm root down to the collectibles map
  const farm = {}
  let node = farm
  for (const key of surfacePath) {
    node[key] = {}
    node = node[key]
  }
  node.collectibles = { [name]: [placedCollectible(name, overrides)] }
  return farm
}

function farmWithCollectible (name, overrides = {}, surface = 'collectibles') {
  return { [surface]: { [name]: [placedCollectible(name, overrides)] } }
}

describe('getDailyDigMax', () => {
  it('is 25 with no boosts', () => {
    expect(getDailyDigMax(null)).toBe(25)
    expect(getDailyDigMax({})).toBe(BASE_DAILY_DIGS)
  })

  it('adds +5 for a properly PLACED Meerkat', () => {
    expect(getDailyDigMax(farmWithCollectible('Meerkat'))).toBe(30)
  })

  it('ignores a Meerkat still in the inventory (not placed)', () => {
    // land 141918 shape: `"Meerkat": 1` under inventory only
    expect(getDailyDigMax({ inventory: { Meerkat: '1' } })).toBe(25)
  })

  it('ignores a placed but not-yet-ready collectible', () => {
    const farm = farmWithCollectible('Meerkat', { readyAt: Date.now() + DAY_MS })
    expect(getDailyDigMax(farm)).toBe(25)
  })

  it('ignores a used or coordinate-less placement', () => {
    expect(getDailyDigMax(farmWithCollectible('Meerkat', { used: true }))).toBe(25)
    expect(getDailyDigMax(farmWithCollectible('Meerkat', { coordinates: null }))).toBe(25)
  })

  it('counts placements on home and interior surfaces', () => {
    expect(getDailyDigMax(farmWithSurface(['home'], 'Meerkat'))).toBe(30)
    expect(getDailyDigMax(farmWithSurface(['interior', 'ground'], 'Meerkat'))).toBe(30)
    expect(getDailyDigMax(farmWithSurface(['interior', 'level_one'], 'Meerkat'))).toBe(30)
    // interior but at top-level collectibles depth (not a real game surface): must NOT count
    expect(getDailyDigMax({ interior: { collectibles: { Meerkat: [placedCollectible('Meerkat')] } } })).toBe(25)
  })

  it('adds +20 Heart of Davy Jones and +1 Pharaoh Chicken when built', () => {
    const farm = {
      collectibles: {
        'Heart of Davy Jones': [placedCollectible('Heart of Davy Jones')],
        'Pharaoh Chicken': [placedCollectible('Pharaoh Chicken')],
      },
    }
    expect(getDailyDigMax(farm)).toBe(46)
  })

  it('adds +5 Bionic Drill only when equipped (bumpkin or farmhand)', () => {
    expect(getDailyDigMax({ bumpkin: { equipped: { tool: 'Pickaxe' } } })).toBe(25)
    expect(getDailyDigMax({ bumpkin: { equipped: { tool: 'Bionic Drill' } } })).toBe(30)
    expect(
      getDailyDigMax({ farmHands: { bumpkins: { '1': { equipped: { tool: 'Bionic Drill' } } } } }),
    ).toBe(30)
  })

  it('stacks collectible and wearable boosts (SFL max 56 case)', () => {
    const farm = {
      collectibles: {
        'Heart of Davy Jones': [placedCollectible('Heart of Davy Jones')],
        Meerkat: [placedCollectible('Meerkat')],
        'Pharaoh Chicken': [placedCollectible('Pharaoh Chicken')],
      },
      bumpkin: { equipped: { tool: 'Bionic Drill' } },
    }
    expect(getDailyDigMax(farm)).toBe(56)
  })
})

describe('getRemainingDigs', () => {
  it('handles missing digging state (fresh day)', () => {
    expect(getRemainingDigs(null, null)).toBe(25)
    expect(getRemainingDigs({ digging: {} }, {})).toBe(25)
  })

  it('mirrors the SFL formula for a plain 25/day player', () => {
    const digging = { grid: new Array(32), extraDigs: 1 } // 32 dug, like land 141918
    expect(getRemainingDigs({ digging }, null)).toBe(1)
  })

  it('uses the boosted max (this is the bug this branch fixes)', () => {
    const digging = { grid: new Array(20), extraDigs: 0 }
    const farm = farmWithCollectible('Meerkat')
    // 30 max − 20 dug = 10 (old code said 25 − 20 = 5)
    expect(getRemainingDigs({ digging }, farm)).toBe(10)
  })

  it('floors negative free digs at zero before adding extras', () => {
    const digging = { grid: new Array(40), extraDigs: 3 }
    expect(getRemainingDigs({ digging }, farmWithCollectible('Meerkat'))).toBe(3) // 30−40→0, +3
  })
})

describe('getActiveStreakCount', () => {
  const now = Date.UTC(2026, 9, 15, 12, 0, 0) // 2026-10-15T12:00Z

  it('returns 0 when nothing was ever claimed', () => {
    expect(getActiveStreakCount(undefined, now)).toBe(0)
    expect(getActiveStreakCount({ count: 8, collectedAt: 0 }, now)).toBe(0)
  })

  it('keeps the count when claimed today', () => {
    expect(getActiveStreakCount({ count: 8, collectedAt: now - 3 * 3600_000 }, now)).toBe(8)
  })

  it('keeps the count when claimed yesterday (day difference == 1)', () => {
    expect(getActiveStreakCount({ count: 8, collectedAt: now - DAY_MS }, now)).toBe(8)
  })

  it('resets to 0 once more than a day has passed (SFL getStreaks rule)', () => {
    // Claimed 2 days ago at the same UTC time — the game shows 0.
    expect(getActiveStreakCount({ count: 8, collectedAt: now - 2 * DAY_MS }, now)).toBe(0)
  })

  it('handles the UTC-day boundary exactly like the game', () => {
    // SFL getStreaks compares UTC calendar DATES: gap = date(now) − date(claim).
    // Claimed yesterday (Oct 14) → gap 1 → keeps counting.
    expect(getActiveStreakCount({ count: 4, collectedAt: Date.UTC(2026, 9, 14, 23, 0) }, now)).toBe(4)
    // Claimed Oct 13, now Oct 15 → gap 2 → reset, even though 37h is close.
    expect(getActiveStreakCount({ count: 4, collectedAt: Date.UTC(2026, 9, 13, 23, 0) }, now)).toBe(0)
  })
})

describe('getBestFindValue', () => {
  const getPrice = name =>
    ({ 'Clam Shell': 375, 'Otter Pebble': 200, Vase: 50 })[name] ?? 0

  it('returns the best SINGLE-item price, not a stack total', () => {
    // lands like 141918 dug 4× Clam Shell; the old code reported 4×375=1500
    expect(
      getBestFindValue([{ name: 'Clam Shell', count: 4 }, { name: 'Otter Pebble', count: 3 }], getPrice),
    ).toBe(375)
  })

  it('returns 0 for empty or unknown treasures', () => {
    expect(getBestFindValue([], getPrice)).toBe(0)
    expect(getBestFindValue([{ name: 'Mystery', count: 2 }], getPrice)).toBe(0)
    expect(getBestFindValue(null, getPrice)).toBe(0)
  })
})
