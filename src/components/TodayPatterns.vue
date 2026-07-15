<template>
  <div class="digging-patterns">
    <h2
      class="text-center text-xs sm:text-sm font-semibold m-0 leading-tight shrink-0"
      :title="todayPatternsTitle"
    >
      Today&apos;s Treasures
      <span
        :class="[
          'tooltip inline-block text-[0.65rem] sm:text-xs font-normal',
          isPatternDateStale ? 'text-warning font-semibold' : 'opacity-70',
        ]"
        :data-tip="patternDateTooltip"
      >
        ({{ compactPatternDate }})
      </span>
    </h2>

    <PatternStrip
      :pattern-keys="patternKeys"
      :marked-indexes="markedIndexList"
      :completed-indexes="completedIndexList"
      :guaranteed-indexes="guaranteedIndexList"
      @toggle-mark="toggleMark"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { useNow } from '@vueuse/core'
import { useLandData } from '../composables/useLandData'
import { usePatternMarks } from '@/composables/usePatternMarks.js'
import { buildServerCompletedIndexes } from '@/utils/patternPreview.js'
import { useGridManager } from '@/composables/useGridManager'
import { usePredictionEngine } from '@/composables/usePredictionEngine.js'
import PatternStrip from '@/components/PatternStrip.vue'

const props = defineProps({
  showPrediction: { type: Boolean, default: false },
})

const route = useRoute()
const landId = String(route.params.landId || '')

const {
  dailyPatternKeys: patternKeys,
  dailyPatternDate,
  completedPatternKeys,
  patternKeys: authoritativePatternKeys,
} = useLandData()

const { markedIndexes, toggleMark } = usePatternMarks(landId)

const serverCompletedIndexes = computed(() =>
  buildServerCompletedIndexes(patternKeys.value, completedPatternKeys.value),
)

const markedIndexList = computed(() => [...markedIndexes.value])
const completedIndexList = computed(() => [...serverCompletedIndexes.value])

// Second, independent solver instance — solves against the authoritative
// (server-derived) pattern list, same as Grid.vue's own instance, since
// dailyPatternKeys (the cached "Today's Treasures" list) can occasionally be
// stale relative to it (see isPatternDateStale below).
const { tiles } = useGridManager(landId)
const { guaranteedFormationKeys } = usePredictionEngine(
  tiles,
  authoritativePatternKeys,
  toRef(() => props.showPrediction),
)

const guaranteedIndexList = computed(() => {
  const indexes = []
  patternKeys.value.forEach((key, index) => {
    if (guaranteedFormationKeys.value.has(key) && !serverCompletedIndexes.value.has(index)) {
      indexes.push(index)
    }
  })
  return indexes
})

const now = useNow({ interval: 30000 })
const currentUtcDate = computed(() => new Date(now.value).toISOString().slice(0, 10))
const displayedPatternDate = computed(() => dailyPatternDate.value || currentUtcDate.value)
const formattedPatternDate = computed(() => {
  const [year, month, day] = displayedPatternDate.value.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
})
const isPatternDateStale = computed(() => displayedPatternDate.value !== currentUtcDate.value)
const compactPatternDate = computed(() => (
  isPatternDateStale.value ? `${formattedPatternDate.value} stale` : formattedPatternDate.value
))
const todayPatternsTitle = computed(() => `Today's Treasure Patterns (${compactPatternDate.value})`)
const patternDateTooltip = computed(() => (
  isPatternDateStale.value
    ? `Showing stale patterns from UTC date ${displayedPatternDate.value}. Current UTC date is ${currentUtcDate.value}. Reload to fetch latest patterns.`
    : `Patterns are generated for UTC date ${displayedPatternDate.value}.`
))
</script>
