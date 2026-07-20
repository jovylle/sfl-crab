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
          :to="{ query: {} }"
          class="btn btn-ghost btn-xs shrink-0"
          aria-label="Back to today"
        >
          Today
        </router-link>
      </div>
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
        v-model:showPrediction="showPrediction"
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
        :show-prediction="showPrediction"
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

    <div class="mt-6">
      <DigStats />
    </div>

    <InfoFooter />
  </DiggingPageLayout>
</template>
<script setup>
import { watch, computed, onMounted, onBeforeUnmount, ref } from 'vue'
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
import {
  usePracticePatterns,
  setHistoricalPatternOverride,
  clearHistoricalPatternOverride,
} from '@/composables/usePracticePatterns.js'
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
import { readLandCacheMeta } from '@/utils/landCache.js'

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
const router = useRouter()
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

const grid = useGridManager(landId)
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
const {
  desert,
  patternKeys,
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

// Historical date view (?date=YYYY-MM-DD)
const todayUTC = new Date().toISOString().slice(0, 10)
const activeHistoricalDate = ref(null)

const historicalDateBanner = computed(() => {
  const d = activeHistoricalDate.value
  if (!d) return null
  return `Viewing ${formatDateLabel(d)}, ${d.slice(0, 4)} — patterns may differ from today.`
})

const prevDateQuery = computed(() => {
  const d = activeHistoricalDate.value
  if (!d) return null
  const prev = shiftDate(d, -1)
  return prev ? { date: prev } : null
})

const nextDateQuery = computed(() => {
  const d = activeHistoricalDate.value
  if (!d) return null
  const next = shiftDate(d, 1)
  // Don't navigate to today or future — return null to hide the button
  return next && next < todayUTC ? { date: next } : null
})

const prevDateLabel = computed(() => formatDateLabel(prevDateQuery.value?.date))
const nextDateLabel = computed(() => formatDateLabel(nextDateQuery.value?.date))

async function applyHistoricalDate (dateStr) {
  if (!dateStr || !UTC_DATE_RE.test(dateStr) || dateStr >= todayUTC) {
    clearHistoricalPatternOverride()
    activeHistoricalDate.value = null
    return
  }
  try {
    const { refreshPracticePatterns } = usePracticePatterns()
    const result = await refreshPracticePatterns({ date: dateStr })
    setHistoricalPatternOverride({ date: result.date || dateStr, patterns: result.patterns || [] })
    activeHistoricalDate.value = result.date || dateStr
  } catch (err) {
    console.warn('Historical patterns fetch failed:', err)
    clearHistoricalPatternOverride()
    activeHistoricalDate.value = null
  }
}

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

watch(
  () => route.query.date,
  async (dateParam) => {
    const dateStr = typeof dateParam === 'string' ? dateParam : null
    if (dateStr && UTC_DATE_RE.test(dateStr) && dateStr < todayUTC) {
      await applyHistoricalDate(dateStr)
    } else {
      clearHistoricalPatternOverride()
      activeHistoricalDate.value = null
    }
  },
  { immediate: false },
)

onMounted(async () => {
  const dateParam = route.query.date
  if (typeof dateParam === 'string' && UTC_DATE_RE.test(dateParam) && dateParam < todayUTC) {
    await applyHistoricalDate(dateParam)
  } else {
    try {
      const { refreshPracticePatterns } = usePracticePatterns()
      await refreshPracticePatterns()
    } catch (err) {
      console.warn('Practice patterns refresh failed:', err)
    }
  }

  const routeLandId = route.params.landId

  if (routeLandId) {
    const { shouldAutoFetch } = readLandCacheMeta(routeLandId)
    if (shouldAutoFetch) {
      const { reloadFromServer } = useLandSync({ landId: routeLandId })
      reloadFromServer({ landId: routeLandId, skipCooldown: true })
    }
  }
})

onBeforeUnmount(() => {
  clearHistoricalPatternOverride()
})
</script>
