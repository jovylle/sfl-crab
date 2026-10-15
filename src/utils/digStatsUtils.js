// src/utils/digStatsUtils.js
//
// Pure, framework-free helpers for DigStats.vue. Derived from the SFL game
// source so the panel's "Digs Remaining" and "Current Streak" match what the
// game itself shows:
// - getDailyDigMax / getRemainingDigs  → src/features/game/types/desert.ts
//   (BASE_DAILY_DIGS = 25 + build/wearable boosts)
// - getActiveStreakCount               → src/features/world/ui/beach/Digby.tsx
//   getStreaks() (streaks lapse once a full day passes without claiming)
// - isCollectibleBuilt semantics        → src/features/game/lib/collectibleBuilt.ts
//   (must be PLACED on one of the collectible surfaces with coordinates,
//    fully ready, and not "used" — sitting in the inventory does NOT count)
// - isWearableActive semantics          → src/features/game/lib/wearables.ts
//   (must be EQUIPPED on the bumpkin or any farmhand)

export const BASE_DAILY_DIGS = 25

/**
 * Boost grants pulled from SFL `getDailyDigLimit` (desert.ts).
 * amounts: Heart of Davy Jones +20 (built), Bionic Drill +5 (equipped),
 * Meerkat +5 (built), Pharaoh Chicken +1 (built).
 */
export const DIG_BOOST_COLLECTIBLES = [
  { name: 'Heart of Davy Jones', amount: 20 },
  { name: 'Meerkat', amount: 5 },
  { name: 'Pharaoh Chicken', amount: 1 },
]

export const DIG_BOOST_WEARABLES = [{ name: 'Bionic Drill', amount: 5 }]

/**
 * Mirror of SFL `isCollectibleBuilt`: the collectible must be placed somewhere
 * (`coordinates` set), be past its `readyAt`, and not be marked `used`.
 * `inventory` is intentionally NOT checked — owning one un-placed does nothing.
 * Dog/barn pets ("isPet") and pet-house placement are not modelled here.
 *
 * @param {object} farm  The SFL farm state (visitedFarmState shape).
 * @param {string} name  Collectible name.
 * @param {number} [now] Comparison timestamp (defaults to Date.now()).
 */
export function isCollectibleBuilt (farm, name, now = Date.now()) {
  const surfaces = [
    farm?.collectibles,
    farm?.home?.collectibles,
    farm?.interior?.ground?.collectibles,
    farm?.interior?.level_one?.collectibles,
  ]
  return surfaces.some(
    surface => (surface?.[name] || []).some(
      placed =>
        (placed?.readyAt ?? 0) <= now &&
        !!placed?.coordinates &&
        !placed?.used,
    ),
  )
}

/**
 * Mirror of SFL `isWearableActive`: equipped on the main bumpkin or on any
 * farmhand.
 *
 * @param {object} farm  The SFL farm state.
 * @param {string} name  Wearable name.
 */
export function isWearableActive (farm, name) {
  const equipped = [
    ...Object.values(farm?.bumpkin?.equipped ?? {}),
    ...Object.values(farm?.farmHands?.bumpkins ?? {}).flatMap(b =>
      Object.values(b?.equipped ?? {}),
    ),
  ]
  return equipped.includes(name)
}

/**
 * SFL `getRegularMaxDigs`: base 25 + active digs boosts.
 *
 * @param {object} farm  The SFL farm state (null-safe: plain 25 when absent).
 * @param {number} [now] Comparison timestamp for boost readiness checks.
 */
export function getDailyDigMax (farm, now = Date.now()) {
  let amount = BASE_DAILY_DIGS
  for (const boost of DIG_BOOST_COLLECTIBLES) {
    if (isCollectibleBuilt(farm, boost.name, now)) amount += boost.amount
  }
  for (const boost of DIG_BOOST_WEARABLES) {
    if (isWearableActive(farm, boost.name)) amount += boost.amount
  }
  return amount
}

/**
 * SFL `getRemainingDigs`: boosted daily max minus holes dug today, floored at
 * zero, plus purchased extra digs.
 *
 * @param {object} desert  The desert state (`desert.digging`).
 * @param {object} farm    The SFL farm state (for boost detection).
 * @param {number} [now]   Comparison timestamp for boost readiness checks.
 */
export function getRemainingDigs (desert, farm, now = Date.now()) {
  const dugCount = Array.isArray(desert?.digging?.grid)
    ? desert.digging.grid.length
    : 0
  const extraDigs = desert?.digging?.extraDigs ?? 0
  const digsLeft = Math.max(0, getDailyDigMax(farm, now) - dugCount)
  return digsLeft + extraDigs
}

/**
 * SFL `getStreaks` (Digby.tsx): the counting streak resets to 0 once more than
 * a full day has passed since the last daily-reward claim.
 *
 * @param {{ count?: number, collectedAt?: number }|undefined} streak
 * @param {number} [now]  Comparison timestamp (defaults to Date.now).
 */
export function getActiveStreakCount (streak, now = Date.now()) {
  const collectedAt = streak?.collectedAt ?? 0
  // Compare UTC calendar dates, as the game does via toISOString().slice.
  const collectedDate = new Date(collectedAt).toISOString().slice(0, 10)
  const currentDate = new Date(now).toISOString().slice(0, 10)
  const dayDifference =
    (new Date(currentDate).getTime() - new Date(collectedDate).getTime()) /
    (1000 * 60 * 60 * 24)
  if (dayDifference > 1) return 0
  return streak?.count ?? 0
}

/**
 * Value of the single most valuable treasure type dug today.
 *
 * @param {Array<{ name: string, count: number }>} treasureCounts
 * @param {(name: string) => number} getPrice  Price lookup (per single item).
 */
export function getBestFindValue (treasureCounts, getPrice) {
  let best = 0
  for (const { name } of treasureCounts || []) {
    best = Math.max(best, getPrice(name) || 0)
  }
  return best
}
