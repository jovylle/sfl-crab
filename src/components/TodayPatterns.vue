<template>
  <div class="digging-patterns h-full">
    <h2
      class="text-center lg:text-left text-xs sm:text-sm font-semibold mb-2 sm:mb-3 leading-tight"
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

    <div
      class="pattern-strip"
      :style="patternStripStyle"
    >
      <button
        v-for="(key, i) in patternKeys"
        :key="i"
        type="button"
        :aria-label="patternLabel(key)"
        :title="patternLabel(key)"
        @click="toggleMark(i)"
        :class="[
          'pattern-thumb cursor-pointer transition-shadow relative group rounded-sm overflow-hidden',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          isMarked(i)
            ? 'ring-2 ring-success bg-success/20'
            : 'bg-base-100 dark:bg-neutral-content',
        ]"
      >
        <div
          class="pattern-preview"
        >
          <div
            v-for="cell in 16"
            :key="cell"
            class="pattern-cell"
          >
            <img
              v-if="getPlotAt(key, cell)"
              :src="getImageSrc(getImageUrl(getPlotAt(key, cell).name)).value"
              :alt="getPlotAt(key, cell).name"
              class="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNow } from '@vueuse/core'
import { useLandData } from '../composables/useLandData'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { usePatternStripLayout } from '@/composables/usePatternStripLayout.js'

// Use reliable assets composable
const { getImageSrc } = useReliableAssets()
const { dailyPatternKeys: patternKeys, dailyPatternDate } = useLandData()
const { patternStripStyle } = usePatternStripLayout(patternKeys)
const marked = ref<Set<number>>(new Set()) // Use index as the identifier
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

const GRID_SIZE = 4

function patternLabel(key: string) {
  return key
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toggleMark(index: number) {
  marked.value.has(index)
    ? marked.value.delete(index)
    : marked.value.add(index)
}

function isMarked(index: number) {
  return marked.value.has(index)
}

function getFormationBounds(formation: Array<{ x: number, y: number }>) {
  if (!formation.length) {
    return {
      minX: 0,
      minY: 0,
      width: 0,
      height: 0,
    }
  }

  const xs = formation.map(plot => plot.x)
  const ys = formation.map(plot => plot.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function getPreviewOffset(formation: Array<{ x: number, y: number }>) {
  const { minX, minY, width, height } = getFormationBounds(formation)

  return {
    x: Math.floor((GRID_SIZE - width) / 2) - minX,
    y: Math.floor((GRID_SIZE - height) / 2) - minY,
  }
}

function getPlotAt(key: string, cellIndex: number) {
  const formation = DIGGING_FORMATIONS[key as keyof typeof DIGGING_FORMATIONS] || []
  const idx = cellIndex - 1
  const col = idx % GRID_SIZE            // 0..3
  const row = Math.floor(idx / GRID_SIZE) // 0..3

  const offset = getPreviewOffset(formation)
  const x = col - offset.x
  const y = row - offset.y

  return formation.find(plot => plot.x === x && plot.y === y) || null
}

function getImageUrl(name: string) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}
</script>
