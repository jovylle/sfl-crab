<template>
  <div v-if="patternKeys?.length" class="card grow max-w-[400px] basis-[265px] mx-auto md:mx-0">
    <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">
      <h2 class="card-title text-center text-sm sm:text-lg">Practice Patterns</h2>
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <div
          v-for="(key, i) in patternKeys"
          :key="i"
          :class="[
            'cursor-pointer transition-shadow relative group',
            isMarked(i)
              ? 'bg-success'
              : 'bg-base-100 dark:bg-neutral-content',
            'md:grow basis-[80px] md:basis-[90px] lg:basis-[120px] max-w-[130px]',
          ]"
          @click="toggleMark(i)"
        >
          <span
            class="absolute opacity-0 group-hover:opacity-100 transition-opacity left-1/2 transform -translate-x-1/2 -bottom-3 mt-1 text-[0.75rem] bg-base-100 whitespace-nowrap z-10"
          >
            {{ formatKey(key) }}
          </span>
          <div class="grid grid-cols-4 mx-auto border border-base-300 dark:border-slate-500">
            <div
              v-for="cell in 16"
              :key="cell"
              class="border border-base-300 flex items-center justify-center aspect-square p-0.5"
            >
              <img
                v-if="getPlotAt(key, cell)"
                :src="getImageSrc(getImageUrl(getPlotAt(key, cell).name)).value"
                :alt="getPlotAt(key, cell).name"
                class="max-w-full max-h-full object-contain w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'

const { getImageSrc } = useReliableAssets()

const props = defineProps({
  patternKeys: { type: Array, default: () => [] },
})

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
