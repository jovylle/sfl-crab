<template>
  <div class="card grow max-w-md basis-[265px] mx-auto md:mx-0">
    <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">
      <h3 class="card-title text-center text-sm sm:text-lg mb-3">📊 Dig Statistics</h3>
      
      <!-- Main Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <!-- Total Digs -->
        <div class="bg-base-200 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-primary">{{ totalDigs }}</div>
          <div class="text-xs text-base-content/70">Total Digs</div>
        </div>

        <!-- Current Streak -->
        <div class="bg-base-200 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-secondary">{{ currentStreak }}</div>
          <div class="text-xs text-base-content/70">Current Streak</div>
        </div>

        <!-- Digs Remaining -->
        <div class="bg-base-200 rounded-lg p-3 text-center">
          <div class="text-2xl font-bold text-accent">{{ digsRemaining }}</div>
          <div class="text-xs text-base-content/70">Digs Remaining</div>
        </div>
      </div>

      <!-- Treasure Breakdown -->
      <div v-if="treasureBreakdown.length > 0" class="mt-3">
        <h4 class="text-sm font-semibold mb-2">🎁 Treasures Found Today</h4>
        <div class="flex flex-wrap gap-1">
          <div 
            v-for="treasure in treasureBreakdown" 
            :key="treasure.name"
            class="badge badge-outline badge-sm flex items-center gap-1"
          >
            <span class="text-xs">{{ treasure.icon }}</span>
            <span class="text-xs">{{ treasure.name }}</span>
            <span class="badge badge-primary badge-xs">{{ treasure.count }}</span>
          </div>
        </div>
      </div>

      <!-- Last Dig Info -->
      <div v-if="lastDigTime" class="mt-3 text-xs text-base-content/70">
        <span class="font-medium">Last dig:</span> {{ formatTime(lastDigTime) }}
      </div>

      <!-- Streak History -->
      <div v-if="totalStreaksClaimed > 0" class="mt-3 text-xs text-base-content/70">
        <span class="font-medium">Total streaks claimed:</span> {{ totalStreaksClaimed }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLandData } from '@/composables/useLandData'

const { desert } = useLandData()

// Computed stats from API data
const totalDigs = computed(() => {
  return Array.isArray(desert.value.digging?.grid) 
    ? desert.value.digging.grid.length 
    : 0
})

const currentStreak = computed(() => {
  return desert.value.digging?.streak?.count || 0
})

const totalStreaksClaimed = computed(() => {
  return desert.value.digging?.streak?.totalClaimed || 0
})

const extraDigs = computed(() => {
  return desert.value.digging?.extraDigs || 0
})

const digsRemaining = computed(() => {
  const FREE_DIGS = 25
  const used = totalDigs.value
  const freeRemaining = used < FREE_DIGS ? FREE_DIGS - used : 0
  return freeRemaining + extraDigs.value
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
    'Seaweed': '🌿'
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

<style scoped>
.stats {
  @apply w-full;
}

.stat {
  @apply min-w-[0];
}

.badge {
  @apply whitespace-nowrap;
}
</style>
