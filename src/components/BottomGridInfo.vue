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

// Use reliable assets composable
const { getImageSrc } = useReliableAssets()

// ── Grab the entire `desert` object from your composable ──
const { desert } = useLandData()
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
 * How many “extra bought” digs remain 
 * – this value is already decremented by the backend every time
 *   the user digs _past_ their 25 free digs.
 */
const extraRemaining = computed(() => {
  return desert.value.digging?.extraDigs || 0
})

/**
 * Compute “free remaining” as:
 *   if usedDigs ≤ 25, freeRemaining = 25 – usedDigs
 *   else (i.e. usedDigs > 25), all free digs are gone (0 remain)
 */
const freeRemaining = computed(() => {
  const FREE = 25
  return usedDigs.value < FREE ? FREE - usedDigs.value : 0
})

/**
 * Finally, totalRemaining = freeRemaining + extraRemaining
 */
const totalRemaining = computed(() => {
  return freeRemaining.value + extraRemaining.value
})

// ── URL‐shortening logic (unchanged) ──
const displayUrl = computed(() => {
  try {
    const currentUrl = new URL(window.location.href)
    let path = route.path || currentUrl.pathname

    if (!props.showLandIdInUrl) {
      path = path.replace(/^\/\d+(?=\/|$)/, '') || '/'
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