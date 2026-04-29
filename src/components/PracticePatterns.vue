<template>
  <div v-if="patternKeys?.length" class="card grow max-w-md basis-[265px] mx-auto md:mx-0">
    <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">
      <h2 class="card-title text-center text-sm sm:text-lg">Practice Patterns</h2>
      <div class="flex flex-wrap gap-2 sm:gap-4">
        <div
          v-for="(key, i) in patternKeys"
          :key="i"
          class="relative group md:grow basis-[80px] md:basis-[90px] lg:basis-[120px] max-w-[130px] bg-base-100 dark:bg-neutral-content"
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
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'

const { getImageSrc } = useReliableAssets()

const props = defineProps({
  patternKeys: { type: Array, default: () => [] },
})

const GRID_SIZE = 4
const CENTER_OFFSET = Math.floor(GRID_SIZE / 2) - 1

function formatKey(key) {
  return key.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function getPlotAt(key, cellIndex) {
  const formation = DIGGING_FORMATIONS[key] || []
  const idx = cellIndex - 1
  const col = idx % GRID_SIZE
  const row = Math.floor(idx / GRID_SIZE)
  const x = col - CENTER_OFFSET + 1
  const y = row - CENTER_OFFSET
  return formation.find(p => p.x === x && p.y === y) || null
}

function getImageUrl(name) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}
</script>
