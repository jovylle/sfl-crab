<template>
  <div class="w-full max-w-none">
    <div class="card">
      <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">
        <div class="flex items-center justify-center gap-2 mb-4">
          <h3 class="card-title text-center text-lg sm:text-xl">📊 Dig Statistics</h3>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
          >
            {{ expanded ? 'Less ⌃' : 'More ⋮' }}
          </button>
        </div>
        
        <!-- Financial Summary -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <!-- Total Value Earned -->
          <div class="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
            <div class="text-xl font-bold text-success">💰 {{ totalValueEarned.toLocaleString() }}</div>
            <div class="text-xs text-base-content/70">Total Value (Coins)</div>
          </div>

          <!-- Average Value Per Dig -->
          <div class="bg-info/10 border border-info/20 rounded-lg p-3 text-center">
            <div class="text-xl font-bold text-info">📈 {{ averageValuePerDig.toFixed(1) }}</div>
            <div class="text-xs text-base-content/70">Avg Value/Dig</div>
          </div>

          <!-- Success Rate -->
          <div class="bg-warning/10 border border-warning/20 rounded-lg p-3 text-center">
            <div class="text-xl font-bold text-warning">{{ successRate.toFixed(1) }}%</div>
            <div class="text-xs text-base-content/70">Success Rate</div>
          </div>

          <!-- Best Find -->
          <div class="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center">
            <div class="text-xl font-bold text-secondary">{{ bestFindValue.toLocaleString() }}</div>
            <div class="text-xs text-base-content/70">Best Find Value</div>
          </div>
        </div>

        <!-- Secondary stats — persisted Behind "More" -->
        <div v-show="expanded" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <!-- Total Digs -->
          <div class="bg-base-200 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-primary">{{ totalDigs }}</div>
            <div class="text-xs text-base-content/70">Digs Today</div>
          </div>

          <!-- Current Streak — drops to 0 once >1 day passes without a claim, like in-game -->
          <div class="bg-base-200 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-secondary">{{ activeStreak }}</div>
            <div class="text-xs text-base-content/70">Current Streak</div>
          </div>

          <!-- Digs Remaining — SFL formula: boosted daily max − digs, + purchased extras -->
          <div class="bg-base-200 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-accent">{{ digsRemaining }}</div>
            <div class="text-xs text-base-content/70">Digs Remaining</div>
          </div>
        </div>

        <!-- Treasure Breakdown with Prices -->
        <div v-if="treasureBreakdown.length > 0" class="mt-4">
          <h4 class="text-sm font-semibold mb-3">🎁 Today's Treasure Haul</h4>
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr>
                  <th>Treasure</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="treasure in treasuresWithPrices" :key="treasure.name">
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="text-sm">{{ treasure.icon }}</span>
                      <span class="text-sm font-medium">{{ treasure.name }}</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge badge-primary badge-sm">{{ treasure.count }}</span>
                  </td>
                  <td class="text-right text-sm text-base-content/70">
                    {{ treasure.price.toLocaleString() }}c
                  </td>
                  <td class="text-right font-semibold text-success">
                    {{ treasure.totalValue.toLocaleString() }}c
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-base-300">
                  <td colspan="3" class="font-semibold">Total Value:</td>
                  <td class="text-right font-bold text-success text-lg">
                    {{ totalValueEarned.toLocaleString() }}c
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Last Dig Info — persisted Behind "More" -->
        <div v-if="expanded && lastDigTime" class="mt-3 text-xs text-base-content/70 text-center">
          <span class="font-medium">Last dig:</span> {{ formatTime(lastDigTime) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useNow, useStorage } from '@vueuse/core'
import { useLandData } from '@/composables/useLandData'
import { getTreasuresWithPrices, calculateTotalValue, getTreasurePrice } from '@/utils/treasurePrices'
import {
  getRemainingDigs,
  getActiveStreakCount,
  getBestFindValue,
} from '@/utils/digStatsUtils'

const { landData, desert } = useLandData()

// "More" section (Digs Today / Streak / Remaining / last dig) — collapsed by
// default, remembered across visits. Global key: the panel is identical per site.
const expanded = useStorage('digStats:expanded', false)

// The full SFL farm (game) state — needed for daily-dig boost detection
// (placed collectibles, equipped wearables). Mirrors `visitedFarmState`.
const farm = computed(() => landData.value?.visitedFarmState || {})

// Ticking "now" so the streak lapses on its own and readyAt-gated boost
// placements flip to active without waiting for an unrelated re-render.
const now = useNow({ interval: 30_000 })

// Computed stats from API data
const totalDigs = computed(() => {
  return Array.isArray(desert.value.digging?.grid) 
    ? desert.value.digging.grid.length 
    : 0
})

const activeStreak = computed(() => {
  return getActiveStreakCount(desert.value.digging?.streak, now.value)
})

const digsRemaining = computed(() => {
  return getRemainingDigs(desert.value, farm.value, now.value)
})

const lastDigTime = computed(() => {
  const grid = desert.value.digging?.grid
  if (!Array.isArray(grid) || grid.length === 0) return null
  
  // Find the most recent dig
  const lastDig = grid.reduce((latest, current) => {
    const currentTime = Array.isArray(current) ? current[0]?.dugAt : current?.dugAt
    const latestTime = Array.isArray(latest) ? latest[0]?.dugAt : latest?.dugAt
    return currentTime > latestTime ? current : latest
  })
  
  return Array.isArray(lastDig) ? lastDig[0]?.dugAt : lastDig?.dugAt
})

const treasureBreakdown = computed(() => {
  const grid = desert.value.digging?.grid
  if (!Array.isArray(grid)) return []
  
  const treasureCounts = {}
  
  // Count treasures from all digs
  grid.forEach(dig => {
    const digs = Array.isArray(dig) ? dig : [dig]
    digs.forEach(singleDig => {
      if (singleDig?.items) {
        Object.entries(singleDig.items).forEach(([item, count]) => {
          if (item !== 'Crab' && item !== 'Sand') { // Exclude hints, count only treasures
            treasureCounts[item] = (treasureCounts[item] || 0) + count
          }
        })
      }
    })
  })
  
  // Convert to array with icons
  return Object.entries(treasureCounts).map(([name, count]) => ({
    name,
    count,
    icon: getTreasureIcon(name)
  })).sort((a, b) => b.count - a.count) // Sort by count descending
})

// Enhanced computed properties with financial data
const treasuresWithPrices = computed(() => {
  return getTreasuresWithPrices(treasureBreakdown.value)
})

const totalValueEarned = computed(() => {
  return calculateTotalValue(treasureBreakdown.value)
})

const averageValuePerDig = computed(() => {
  return totalDigs.value > 0 ? totalValueEarned.value / totalDigs.value : 0
})

const successRate = computed(() => {
  if (totalDigs.value === 0) return 0
  const treasureDigs = treasureBreakdown.value.reduce((sum, treasure) => sum + treasure.count, 0)
  return (treasureDigs / totalDigs.value) * 100
})

// Per-item price of the most valuable treasure dug today — a stack of
// 4 cheap shells must not masquerade as a single big find.
const bestFindValue = computed(() => {
  return getBestFindValue(treasureBreakdown.value, getTreasurePrice)
})

// Helper function to get treasure icons
function getTreasureIcon(treasureName) {
  const iconMap = {
    'Hieroglyph': '📜',
    'Cockle Shell': '🐚',
    'Wooden Compass': '🧭',
    'Broken Pillar': '🏛️',
    'Coprolite': '💩',
    'Ancient Clock': '🕰️',
    'Scarab': '🪲',
    'Cow Skull': '💀',
    'Old Bottle': '🍾',
    'Seaweed': '🌿',
    'Starfish': '⭐',
    'Vase': '🏺',
    'Camel Bone': '🦴',
    'Iron Compass': '🧭',
    'Emerald Compass': '🧭',
    'Pipi': '🐚',
    'Clam Shell': '🐚',
    'Coral': '🪸',
    'Pearl': '🫧',
    'Pirate Bounty': '🏴‍☠️',
    'Sea Cucumber': '🥒'
  }
  return iconMap[treasureName] || '💎'
}

// Helper function to format timestamp
function formatTime(timestamp) {
  if (!timestamp) return 'Never'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>
