<template>
  <DiggingPageLayout>
    <template #toolbar>
      <TestnetLandBanner />
      <div
        v-if="marksGuideBanner"
        class="alert alert-info text-sm py-2 px-3 mb-2 shadow-sm"
        role="status"
      >
        <span class="flex-1">{{ marksGuideBanner }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs shrink-0"
          aria-label="Dismiss"
          @click="marksGuideBanner = null"
        >
          ✕
        </button>
      </div>
      <DigToolSection
        v-model:showTreasureOrder="showTreasureOrder"
        v-model:hideLandIdInUrl="hideLandIdInUrl"
        :dig-day-sync-status="digDaySyncStatus"
        :dig-day-updated-at="digDayUpdatedAt"
        :dig-day-sync-error="digDaySyncError"
        :hub-replay-url="hubReplayUrl"
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
      :land-id="String(landId)"
      :step="replayStep"
      :max-step="replayMaxStep"
      :step-label="replayStepLabel"
      :is-playing="replayIsPlaying"
      :replay-cells="replayCells"
      :replay-order-map="replayOrderMap"
      :pattern-keys="dailyPatternKeys"
      :pattern-date-label="replayPatternDateLabel"
      :marked-pattern-indexes="markedPatternIndexList"
      :completed-pattern-indexes="completedPatternIndexList"
      @close="closeReplay()"
      @prev="stepPrev()"
      @next="stepNext()"
      @update:step="setReplayStep($event)"
      @toggle-play="toggleReplayPlay()"
      @pause="pauseReplay()"
    />

    <div class="mt-6">
      <DigStats />
    </div>

    <InfoFooter />
  </DiggingPageLayout>
</template>
<script setup>
import { watch, computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DiggingPageLayout from '@/components/DiggingPageLayout.vue'
import DigToolSection from '@/components/DigToolSection.vue'
import TestnetLandBanner from '@/components/TestnetLandBanner.vue'
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
import { buildServerCompletedIndexes } from '@/utils/patternPreview.js'
import { usePatternMarks } from '@/composables/usePatternMarks.js'
import {
  decodeGridState,
  applySharedMarks,
  isValidEncodedState,
} from '@/utils/gridStateCodec.js'
import { getLandDataStorageKey } from '@/config/api.js'

const route = useRoute()
const router = useRouter()
const landId = route.params.landId || 'guest'
const showTreasureOrder = useLocalStorage(
  `showTreasureOrder-${landId}`, false
)
const hideLandIdInUrl = useLocalStorage(
  `hideLandIdInUrl-${landId}`, false
)

const grid = useGridManager(landId)
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
const {
  desert,
  dailyPatternKeys,
  dailyPatternDate,
  completedPatternKeys,
} = useLandData(defaults)
const hasDailyPatterns = computed(() => dailyPatternKeys.value.length > 0)

const { markedIndexes: markedPatternIndexes } = usePatternMarks(landId)
const markedPatternIndexList = computed(() => [...markedPatternIndexes.value])
const completedPatternIndexList = computed(() => [
  ...buildServerCompletedIndexes(
    dailyPatternKeys.value,
    completedPatternKeys.value,
  ),
])
const replayPatternDateLabel = computed(() => {
  const raw = dailyPatternDate.value
  if (!raw) return ''
  const [year, month, day] = raw.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
})

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
  pause: pauseReplay,
} = useDigReplay(landId, desert)

const marksGuideBanner = ref(null)
let marksFromLinkApplied = false
let replayFromLinkOpened = false

function extractMarksFromLegacyMalformedLink () {
  const fullPath = String(route.fullPath || '')
  const match = fullPath.match(/[?&]testnet\?marks=([^&#]+)/)
  return match?.[1] || null
}

function stripShareQuery () {
  const q = { ...route.query }
  delete q.replay
  delete q.marks
  delete q.grid
  router.replace({ query: q })
}

function tryApplyMarksFromLink () {
  if (marksFromLinkApplied) return
  const encoded = route.query.marks || route.query.grid || extractMarksFromLegacyMalformedLink()
  if (!encoded || typeof encoded !== 'string') return
  if (!isValidEncodedState(encoded)) return
  if (!grid.tiles.value.length) return

  try {
    const state = decodeGridState(encoded)
    const count = applySharedMarks(state, grid)
    if (count > 0) {
      marksFromLinkApplied = true
      marksGuideBanner.value =
        `Marks from link loaded (${count} cells) — dig in Sunflower Land with this grid open on d1g.`
      stripShareQuery()
    }
  } catch (err) {
    console.warn('Invalid marks link:', err)
  }
}

function tryOpenReplayFromLink () {
  if (replayFromLinkOpened) return
  if (!route.query.replay) return
  if (!canReplay.value) return
  replayFromLinkOpened = true
  openReplay()
  stripShareQuery()
}

watch(
  () => [
    route.query.marks,
    route.query.grid,
    grid.tiles.value.length,
    desert.value.digging?.grid?.length,
  ],
  () => tryApplyMarksFromLink(),
  { immediate: true }
)

watch(canReplay, (ok) => {
  if (ok) tryOpenReplayFromLink()
}, { immediate: true })

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
    const raw = JSON.parse(
      localStorage.getItem(getLandDataStorageKey(routeLandId)) || '{}',
    )
    const isStale = raw?.date !== today || !raw?.visitedFarmState
    if (isStale) {
      const { reloadFromServer } = useLandSync({ landId: routeLandId })
      reloadFromServer({ landId: routeLandId })
    }
  }
})
</script>
