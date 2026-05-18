<template>
    <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
      <!-- Manual Marks clear & Grid -->
      <div
        class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0"
      >
        <div
          class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1"
        >
          <DigToolSection
            v-model:showTreasureOrder="showTreasureOrder"
            v-model:hideLandIdInUrl="hideLandIdInUrl"
            :dig-day-sync-status="digDaySyncStatus"
            :dig-day-updated-at="digDayUpdatedAt"
            :can-replay="digReplay.canReplay"
            @open-replay="digReplay.openReplay()"
          />

          <DigReplayControls
            :open="digReplay.isOpen"
            :step="digReplay.step"
            :max-step="digReplay.maxStep"
            :step-label="digReplay.stepLabel"
            @close="digReplay.closeReplay()"
            @prev="digReplay.stepPrev()"
            @next="digReplay.stepNext()"
            @update:step="digReplay.setStep($event)"
          />

          <Grid
            :show-treasure-order="showTreasureOrder || digReplay.isOpen"
            :treasure-order-map="treasureOrderMap"
            :show-land-id-in-url="!hideLandIdInUrl"
            :replay-tiles="digReplay.replayCells"
            :replay-read-only="digReplay.isOpen"
          />
        </div>
      </div>

      <TodayPatterns />
    </div>

    <!-- Dig Statistics - Full Width Section -->
    <div class="mt-6">
      <DigStats />
    </div>

  <div>
    <InfoFooter />
  </div>
</template>
<script setup>
import { watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DigToolSection from '@/components/DigToolSection.vue'
import DigReplayControls from '@/components/DigReplayControls.vue'
import Grid           from '@/components/Grid.vue'
import TodayPatterns  from '@/components/TodayPatterns.vue'
import DigStats       from '@/components/DigStats.vue'
import InfoFooter     from '@/components/InfoFooter.vue'
import { useLandData }    from '@/composables/useLandData'
import { useGridManager } from '@/composables/useGridManager'
import { useLandSync } from '@/composables/useLandSync'
import { usePracticePatterns } from '@/composables/usePracticePatterns.js'
import { useDigDayStore } from '@/composables/useDigDayStore.js'
import { useDigReplay } from '@/composables/useDigReplay.js'
import { buildTreasureOrderMap } from '@/utils/buildDigTimeline.js'

// 1) landId and persistent toggle
const route = useRoute()
const landId = route.params.landId || 'guest'
const showTreasureOrder = useLocalStorage(
  `showTreasureOrder-${landId}`, false
)
const hideLandIdInUrl = useLocalStorage(
  `hideLandIdInUrl-${landId}`, false
)

// 2) grid engine + API watch
const grid = useGridManager(landId)
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert } = useLandData(defaults)

const { syncStatus: digDaySyncStatus, lastUpdatedAt: digDayUpdatedAt } = useDigDayStore(
  landId,
  desert
)

const digReplay = useDigReplay(landId, desert)

watch(
  () => desert.value.digging?.grid,
  rawGrid => {
    if (!rawGrid) return
    // flatten any nested arrays into one list of tile-digs
    const flatGrid = rawGrid.flat(Infinity)
    grid.update(flatGrid)
  },
  { immediate: true }
)

const treasureOrderMap = computed(() => {
  const total = grid.tiles.value.length
  if (!total) return []
  const gridSize = Math.sqrt(total)
  const rawGrid = desert.value.digging?.grid || []
  const map = buildTreasureOrderMap(rawGrid, gridSize)
  if (digReplay.isOpen.value) {
    const cap = digReplay.step.value
    return map.map((n) => (n != null && n <= cap ? n : null))
  }
  return map
})



// 🔁 Auto-reload landData if stale on initial app load
onMounted(async () => {
  // Warm the practice patterns cache for the main digging page too.
  try {
    const { refreshPracticePatterns } = usePracticePatterns()
    await refreshPracticePatterns()
    console.log('Practice patterns refreshed from Digging page')
  } catch (err) {
    console.warn('Practice patterns refresh failed:', err)
  }

  const routeLandId = route.params.landId
  const today = new Date().toISOString().slice(0, 10)

  if (routeLandId) {
    const raw = JSON.parse(localStorage.getItem(`landData_${routeLandId}`) || '{}')
    const isStale = raw?.date !== today || !raw?.visitedFarmState
    if (isStale) {
      const { reloadFromServer } = useLandSync({ landId: routeLandId })
      reloadFromServer({ landId: routeLandId })
    }
  }
})
</script>
