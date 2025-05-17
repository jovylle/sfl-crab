<template>
  <div v-if="patternKeys?.length" class="card grow max-w-md basis-[265px] mx-auto md:mx-0">
    <div class="card-body [@media(max-width:639px)]:p-3 [@media(max-width:639px)]:pt-0">
      <h2 class="card-title text-center text-sm sm:text-lg">Today's Treasure Patterns</h2>
      <div
        class="
          flex flex-wrap         /* wrap into new rows */
          gap-2 sm:gap-4                  /* consistent gutters */
        "
      >
        <div
          v-for="(key, i) in patternKeys"
          :key="i"
          @click="toggleMark(i)"
          :class="[
            'cursor-pointer transition-shadow',
            isMarked(i)
              ? 'bg-success'
              : 'bg-base-100 dark:bg-neutral-content',
            /* flex item sizing: */
            'md:grow basis-[80px] md:basis-[90px] lg:basis-[120px] max-w-[130px]'
          ]"
        >
          <!-- your existing 4×4 grid inside -->
          <div class="grid grid-cols-4 mx-auto border border-base-300">
            <div
              v-for="cell in 16"
              :key="cell"
              class="border border-base-300 flex items-center justify-center aspect-square p-0.5"
            >
              <img
                v-if="getPlotAt(key, cell)"
                :src="getImageUrl(getPlotAt(key, cell).name)"
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

<script setup lang="ts">
import { ref } from 'vue'
import { useLandData } from '../composables/useLandData'
import { DIGGING_FORMATIONS } from '../../src_other/features/game/types/desert'
import { useRoute } from 'vue-router'
const route = useRoute()
const { patternKeys } = useLandData()
const marked = ref<Set<number>>(new Set()) // Use index as the identifier

const GRID_SIZE     = 4
const CENTER_OFFSET = Math.floor(GRID_SIZE / 2) - 1 // = 2

function toggleMark(index: number) {
  marked.value.has(index)
    ? marked.value.delete(index)
    : marked.value.add(index)
}

function isMarked(index: number) {
  return marked.value.has(index)
}

function getPlotAt(key: string, cellIndex: number) {
  const formation = DIGGING_FORMATIONS[key as keyof typeof DIGGING_FORMATIONS] || []
  const idx = cellIndex - 1
  const col = idx % GRID_SIZE            // 0..3
  const row = Math.floor(idx / GRID_SIZE) // 0..3

  // center the origin on (CENTER_OFFSET, CENTER_OFFSET)
  const x = col - CENTER_OFFSET + 1
  const y = row - CENTER_OFFSET

  return formation.find(plot => plot.x === x && plot.y === y) || null
}

function getImageUrl(name: string) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}
</script>
