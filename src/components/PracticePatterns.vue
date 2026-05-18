<template>
  <div class="digging-patterns h-full">
    <h2
      class="text-center text-xs sm:text-sm font-semibold mb-2 sm:mb-3 leading-tight"
      title="Patterns for this practice round"
    >
      Round Patterns
    </h2>

    <div
      class="pattern-strip grid grid-rows-2 gap-1.5 sm:gap-2 w-full max-w-[min(100%,22rem)] mx-auto lg:max-w-none lg:mx-0"
      :style="patternStripStyle"
    >
      <button
        v-for="(key, i) in patternKeys"
        :key="i"
        type="button"
        :aria-label="formatKey(key)"
        :title="formatKey(key)"
        @click="toggleMark(i)"
        :class="[
          'pattern-thumb w-full max-w-[5.5rem] mx-auto cursor-pointer transition-shadow relative group rounded-sm overflow-hidden',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          isMarked(i)
            ? 'ring-2 ring-success bg-success/20'
            : 'bg-base-100 dark:bg-neutral-content',
        ]"
      >
        <div
          class="grid grid-cols-4 w-full border border-base-300 dark:border-slate-500 aspect-square"
        >
          <div
            v-for="cell in 16"
            :key="cell"
            class="border border-base-300 flex items-center justify-center aspect-square p-px sm:p-0.5"
          >
            <img
              v-if="getPlotAt(key, cell)"
              :src="getImageSrc(getImageUrl(getPlotAt(key, cell).name)).value"
              :alt="getPlotAt(key, cell).name"
              class="max-w-full max-h-full object-contain w-full"
            />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'

const { getImageSrc } = useReliableAssets()

const props = defineProps({
  patternKeys: { type: Array, default: () => [] },
})

const patternColumnCount = computed(() => {
  const n = props.patternKeys.length
  if (n <= 0) return 4
  return Math.ceil(n / 2)
})

const patternStripStyle = computed(() => ({
  gridTemplateColumns: `repeat(${patternColumnCount.value}, minmax(3.25rem, 1fr))`,
}))

const GRID_SIZE = 4
const marked = ref(new Set())

function formatKey(key) {
  return key.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function toggleMark(index) {
  const next = new Set(marked.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  marked.value = next
}

function isMarked(index) {
  return marked.value.has(index)
}

function getFormationBounds(formation) {
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

function getPreviewOffset(formation) {
  const { minX, minY, width, height } = getFormationBounds(formation)

  return {
    x: Math.floor((GRID_SIZE - width) / 2) - minX,
    y: Math.floor((GRID_SIZE - height) / 2) - minY,
  }
}

function getPlotAt(key, cellIndex) {
  const formation = DIGGING_FORMATIONS[key] || []
  const idx = cellIndex - 1
  const col = idx % GRID_SIZE
  const row = Math.floor(idx / GRID_SIZE)
  const offset = getPreviewOffset(formation)
  const x = col - offset.x
  const y = row - offset.y
  return formation.find(p => p.x === x && p.y === y) || null
}

function getImageUrl(name) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}
</script>
