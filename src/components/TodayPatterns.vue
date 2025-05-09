<template>
  <div v-if="patternKeys && patternKeys.length > 0" class="mt-4">
    <div
      tabindex="0"
      class="collapse collapse-arrow bg-base-100 border-base-300 border "
    >
      <input type="checkbox" />
      <div class="collapse-title font-semibold">Today's Treasure Patterns</div>
      <div class="collapse-content text-sm max-w-xl">
        <div class="">
          <div
            v-for="(key, index) in patternKeys"
            :key="index"
            class="border border-base-300 m-2 inline-block rounded p-2 cursor-pointer hover:shadow transition-shadow"
            :class="{
                  'bg-success': isMarked(index),
                  'bg-base-100 dark:bg-neutral-content':      !isMarked(index)
                }"
            @click="toggleMark(index)"
          >
            <!-- <h4 class="text-sm font-medium mb-2 truncate text-center">{{ key.replace(/_/g, ' ') }}</h4> -->
            <!-- 4×4 preview box -->
            <div
              class="w-18 h-18 sm:w-24 sm:h-24 grid grid-cols-4 mx-auto border border-base-300"
            >
              <div
                v-for="cell in 16"
                :key="cell"
                class="border border-base-300 flex items-center justify-center aspect-square"
              >
                <img
                  v-if="getPlotAt(key, cell)"
                  :src="getImageUrl(getPlotAt(key, cell).name)"
                  :alt="getPlotAt(key, cell).name"
                  class="max-w-full max-h-full object-contain"
                />
              </div>
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
  const x = col - CENTER_OFFSET
  const y = row - CENTER_OFFSET

  return formation.find(plot => plot.x === x && plot.y === y) || null
}

function getImageUrl(name: string) {
  return `/world/${name.toLowerCase().replace(/\s+/g, '_')}.webp`
}
</script>

<style scoped>
h3 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
