<template>
  <DiggingPageLayout>
    <template #toolbar>
      <TestnetLandBanner />
      <div
        v-if="historicalDateBanner"
        class="alert alert-warning text-sm py-2 px-3 mb-2 shadow-sm"
        role="status"
      >
        <span class="flex-1">{{ historicalDateBanner }}</span>
        <router-link
          v-if="prevDateQuery"
          :to="{ query: prevDateQuery }"
          class="btn btn-ghost btn-xs shrink-0"
        >
          ← {{ prevDateLabel }}
        </router-link>
        <router-link
          v-if="nextDateQuery"
          :to="{ query: nextDateQuery }"
          class="btn btn-ghost btn-xs shrink-0"
        >
          {{ nextDateLabel }} →
        </router-link>
        <router-link
          :to="{ name: 'Digging', params: route.params }"
          class="btn btn-ghost btn-xs shrink-0"
          aria-label="Back to today"
        >
          Today
        </router-link>
      </div>
      <div
        v-if="historicalNoDataNote"
        class="alert alert-info text-sm py-2 px-3 mb-2 shadow-sm"
        role="status"
      >
        <span class="flex-1">{{ historicalNoDataNote }}</span>
      </div>
      <DigToolSection
        v-model:showTreasureOrder="showTreasureOrder"
        v-model:hideLandIdInUrl="hideLandIdInUrl"
        v-model:showPrediction="showPrediction"
        :can-replay="canReplay"
        @open-replay="openReplay()"
      />
    </template>

    <template #grid>
      <Grid
        :show-treasure-order="showTreasureOrder"
        :treasure-order-map="treasureOrderMap"
        :show-land-id-in-url="!hideLandIdInUrl"
        :show-prediction="showPrediction"
        :interactive="false"
      />
    </template>

    <template v-if="hasDailyPatterns" #patterns>
      <TodayPatterns :show-prediction="showPrediction" />
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
      :show-prediction="showPrediction"
      @close="closeReplay()"
      @prev="stepPrev()"
      @next="stepNext()"
      @update:step="setReplayStep($event)"
      @toggle-play="toggleReplayPlay()"
      @pause="pauseReplay()"
    />

    <InfoFooter />
  </DiggingPageLayout>
</template>
<script setup>
import { watch, computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DiggingPageLayout from '@/components/DiggingPageLayout.vue'
import DigToolSection from '@/components/DigToolSection.vue'
import TestnetLandBanner from '@/components/TestnetLandBanner.vue'
import DigReplayModal from '@/components/DigReplayModal.vue'
import Grid           from '@/components/Grid.vue'
import TodayPatterns  from '@/components/TodayPatterns.vue'
import InfoFooter     from '@/components/InfoFooter.vue'
import { useLandData }    from '@/composables/useLandData'
import { useGridManager } from '@/composables/useGridManager'
import {
  usePracticePatterns,
  setHistoricalPatternOverride,
  clearHistoricalPatternOverride,
} from '@/composables/usePracticePatterns.js'
import { fetchDigDay } from '@/services/digDayApiService.js'
import { useDigReplay } from '@/composables/useDigReplay.js'
import { buildTreasureOrderMap } from '@/utils/buildDigTimeline.js'
import { buildServerCompletedIndexes } from '@/utils/patternPreview.js'
import { usePatternMarks } from '@/composables/usePatternMarks.js'

const UTC_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function formatDateLabel (utcDate) {
  if (!utcDate || !UTC_DATE_RE.test(utcDate)) return ''
  const [year, month, day] = utcDate.split('-')
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function shiftDate (utcDate, days) {
  if (!utcDate || !UTC_DATE_RE.test(utcDate)) return null
  const [year, month, day] = utcDate.split('-')
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + days))
  return d.toISOString().slice(0, 10)
}

const route = useRoute()
const landId = route.params.landId || 'guest'
const showTreasureOrder = useLocalStorage(
  `showTreasureOrder-${landId}`, false
)
const hideLandIdInUrl = useLocalStorage(
  `hideLandIdInUrl-${landId}`, false
)
const showPrediction = useLocalStorage(
  `showPrediction-${landId}`, true
)

const todayUTC = new Date().toISOString().slice(0, 10)

function resolveInitialDate () {
  const d = route.query.date
  if (typeof d === 'string' && UTC_DATE_RE.test(d) && d < todayUTC) return d
  return shiftDate(todayUTC, -1)
}

const activeDate = ref(resolveInitialDate())
const historicalGrid = ref(null)

const grid = useGridManager(landId)
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
const {
  dailyPatternKeys,
  dailyPatternDate,
  completedPatternKeys,
} = useLandData(defaults)
const hasDailyPatterns = computed(() => dailyPatternKeys.value.length > 0)

const effectiveDesert = computed(() => ({
  digging: { grid: historicalGrid.value || [] },
}))

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
} = useDigReplay(landId, effectiveDesert)

const historicalDateBanner = computed(() => {
  const d = activeDate.value
  if (!d) return null
  return `Viewing ${formatDateLabel(d)}, ${d.slice(0, 4)} — patterns may differ from today.`
})

const historicalNoDataNote = computed(() => {
  const d = activeDate.value
  if (!d) return null
  if (!Array.isArray(historicalGrid.value) || historicalGrid.value.length > 0) return null
  return `No dig data was saved for ${formatDateLabel(d)}, ${d.slice(0, 4)}.`
})

const prevDateQuery = computed(() => {
  const d = activeDate.value
  if (!d) return null
  const prev = shiftDate(d, -1)
  return prev ? { date: prev } : null
})

const nextDateQuery = computed(() => {
  const d = activeDate.value
  if (!d) return null
  const next = shiftDate(d, 1)
  // Don't navigate to today or future — return null to hide the button
  return next && next < todayUTC ? { date: next } : null
})

const prevDateLabel = computed(() => formatDateLabel(prevDateQuery.value?.date))
const nextDateLabel = computed(() => formatDateLabel(nextDateQuery.value?.date))

async function applyHistoricalDate (dateStr) {
  const safeDateStr =
    (dateStr && UTC_DATE_RE.test(dateStr) && dateStr < todayUTC)
      ? dateStr
      : shiftDate(todayUTC, -1)

  activeDate.value = safeDateStr
  const { refreshPracticePatterns } = usePracticePatterns()
  const [patternsResult, digDayResult] = await Promise.allSettled([
    refreshPracticePatterns({ date: safeDateStr }),
    fetchDigDay(landId, safeDateStr),
  ])
  if (patternsResult.status === 'fulfilled') {
    const result = patternsResult.value
    setHistoricalPatternOverride({ date: result.date || safeDateStr, patterns: result.patterns || [] })
    activeDate.value = result.date || safeDateStr
  } else {
    console.warn('Historical patterns fetch failed:', patternsResult.reason)
    clearHistoricalPatternOverride()
  }
  if (digDayResult.status === 'fulfilled') {
    const remote = digDayResult.value
    const flatTiles = []
    for (const step of (remote?.digs || [])) {
      for (const tile of (step.tiles || [])) {
        flatTiles.push({ x: tile.x, y: tile.y, items: tile.items ? { ...tile.items } : {} })
      }
    }
    historicalGrid.value = flatTiles
  } else {
    console.warn('Historical dig day fetch failed:', digDayResult.reason)
    historicalGrid.value = []
  }
}

watch(
  () => effectiveDesert.value.digging?.grid,
  rawGrid => {
    if (!rawGrid) return
    const flatGrid = rawGrid.flat(Infinity)
    grid.update(flatGrid, { applyHints: false })
  },
  { immediate: true }
)

const treasureOrderMap = computed(() => {
  const total = grid.tiles.value.length
  if (!total) return []
  const gridSize = Math.sqrt(total)
  const rawGrid = effectiveDesert.value.digging?.grid || []
  return buildTreasureOrderMap(rawGrid, gridSize)
})

watch(
  () => route.query.date,
  async (dateParam) => {
    const dateStr = typeof dateParam === 'string' ? dateParam : null
    await applyHistoricalDate(dateStr)
  },
)

onMounted(async () => {
  await applyHistoricalDate(activeDate.value)
})

onBeforeUnmount(() => {
  clearHistoricalPatternOverride()
})
</script>
