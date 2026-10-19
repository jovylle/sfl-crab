<!-- src/components/BottomGridInfo.vue -->
<template>
  <div
    class="absolute left-1/2 -bottom-4 transform -translate-x-1/2
           text-[0.45rem] sm:text-[0.5rem] lg:text-xs origin-center
           opacity-90 select-none pointer-events-none flex items-center gap-2 sm:gap-4"
  >
    <!-- Shortened URL -->
    
    <span class="text-nowrap">🔗 {{ displayUrl }}</span>

    <span class="flex items-center text-nowrap">
      <img
        :src="getImageSrc('/images/sand-shovel.png').value"
        alt="Shovel"
        class="w-4 h-4"
      />
      <!-- <span class="ml-0.5 font-medium text-nowrap">Digs left: {{ totalRemaining }} </span> -->
      <span class="ml-0.5 font-medium text-nowrap">Digs made: {{ usedDigs }} </span>
    </span>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLandData } from '@/composables/useLandData'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { getRemainingDigs } from '@/utils/digStatsUtils'

// Use reliable assets composable
const { getImageSrc } = useReliableAssets()

// ── Grab the entire `desert` object from your composable ──
const { landData, desert } = useLandData()
const route = useRoute()
const props = defineProps({
  showLandIdInUrl: { type: Boolean, default: true },
})

/** 
 * How many digs have been used so far (both free and extra) 
 * – `grid` is an array of all dig entries.
 */
const usedDigs = computed(() => {
  return Array.isArray(desert.value.digging?.grid)
    ? desert.value.digging.grid.length
    : 0
})

/**
 * Total digs left today, matching the SFL game exactly (`desert.ts
 * getRemainingDigs` via digStatsUtils): boosted daily max (25 + placed
 * collectible / equipped wearable boosts) − dug today, floored at 0,
 * plus purchased `extraDigs`. The display is currently commented out in
 * the template, but the math stays live and SFL-accurate for whoever
 * re-enables it — no hardcoded 25 here.
 */
const totalRemaining = computed(() => {
  return getRemainingDigs(desert.value, landData.value?.visitedFarmState || {})
})

// ── URL‐shortening logic (unchanged) ──
const displayUrl = computed(() => {
  try {
    const currentUrl = new URL(window.location.href)
    let path = route.path || currentUrl.pathname

    // Keep URL display compact on digging pages.
    path = path.replace(/\/digging\/?$/, '')

    if (!props.showLandIdInUrl) {
      path = path.replace(/^\/test\/\d+(?=\/|$)/, '/test')
      path = path.replace(/^\/\d+(?=\/|$)/, '') || '/'
    }

    if (!path || path === '/') {
      return currentUrl.host
    }

    return `${currentUrl.host}${path}`
  } catch {
    return window.location.href.replace(/^https?:\/\//, '')
  }
})
</script>

<style scoped>
/* Tailwind classes in the template handle all styling */
</style>