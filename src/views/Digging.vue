<template>
  <DiggingPageLayout>
    <template #toolbar>
      <DigToolSection
        v-model:showTreasureOrder="showTreasureOrder"
        v-model:hideLandIdInUrl="hideLandIdInUrl"
        :dig-day-sync-status="digDaySyncStatus"
        :dig-day-updated-at="digDayUpdatedAt"
        :dig-day-sync-error="digDaySyncError"
        :can-replay="canReplay"
        @open-replay="openReplay()"
      />
    </template>

    <template #grid>
      <Grid
        :show-treasure-order="showTreasureOrder"
        :treasure-order-map="treasureOrderMap"
        :show-land-id-in-url="!hideLandIdInUrl"
      />
    </template>

    <template v-if="hasDailyPatterns" #patterns>
      <TodayPatterns />
    </template>

    <DigReplayModal
      :open="replayOpen"
      :step="replayStep"
      :max-step="replayMaxStep"
      :step-label="replayStepLabel"
      :is-playing="replayIsPlaying"
      :replay-cells="replayCells"
      :replay-order-map="replayOrderMap"
      :hub-replay-url="hubReplayUrl"
      @close="closeReplay()"
      @prev="stepPrev()"
      @next="stepNext()"
      @update:step="setReplayStep($event)"
      @toggle-play="toggleReplayPlay()"
    />

    <div class="mt-6">
      <DigStats />
    </div>

    <InfoFooter />
  </DiggingPageLayout>
</template>
<script setup>
import { watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DiggingPageLayout from '@/components/DiggingPageLayout.vue'
import DigToolSection from '@/components/DigToolSection.vue'
import DigReplayModal from '@/components/DigReplayModal.vue'
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

const route = useRoute()
const landId = route.params.landId || 'guest'
const showTreasureOrder = useLocalStorage(
  `showTreasureOrder-${landId}`, false
)
const hideLandIdInUrl = useLocalStorage(
  `hideLandIdInUrl-${landId}`, false
)

const grid = useGridManager(landId)
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert, dailyPatternKeys } = useLandData(defaults)
const hasDailyPatterns = computed(() => dailyPatternKeys.value.length > 0)

const {
  syncStatus: digDaySyncStatus,
  lastUpdatedAt: digDayUpdatedAt,
  syncError: digDaySyncError,
  hubReplayUrl,
} = useDigDayStore(landId, desert)

const {
  isOpen: replayOpen,
  step: replayStep,
  maxStep: replayMaxStep,
  stepLabel: replayStepLabel,
  isPlaying: replayIsPlaying,
  replayCells,
  replayOrderMap,
  canReplay,
  openReplay,
  closeReplay,
  setStep: setReplayStep,
  stepPrev,
  stepNext,
  togglePlay: toggleReplayPlay,
} = useDigReplay(landId, desert)

watch(
  () => desert.value.digging?.grid,
  rawGrid => {
    if (!rawGrid) return
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
  return buildTreasureOrderMap(rawGrid, gridSize)
})

onMounted(async () => {
  try {
    const { refreshPracticePatterns } = usePracticePatterns()
    await refreshPracticePatterns()
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
