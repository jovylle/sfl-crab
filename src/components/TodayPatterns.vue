<template>
  <div v-if="patternKeys" class="mt-4">
    <div class="collapse bg-base-100 border-base-300 border">
      <input type="checkbox" />
      <div class="collapse-title font-semibold">Today's Treasure Patterns</div>
      <div class="collapse-content text-sm">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="key in patternKeys"
            :key="key"
            class="border rounded border-gray-300 p-2 cursor-pointer hover:shadow transition-shadow"
            :class="{
              'bg-[#78e9a2]': isMarked(key),
              'bg-white':      !isMarked(key)
            }"
            @click="toggleMark(key)"
          >
            <h4 class="text-sm font-medium mb-2 truncate text-center">{{ key.replace(/_/g, ' ') }}</h4>
            <!-- 4×4 preview box -->
            <div class="w-18 h-18 grid gap-0.5 grid-cols-4 mx-auto">
              <div
                v-for="cell in 16"
                :key="cell"
                class="border bg-white border-gray-300 flex items-center justify-center aspect-square"
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
import { DIGGING_FORMATIONS } from '../features/game/types/desert'

const { patternKeys } = useLandData()
const marked = ref<Set<string>>(new Set())

const GRID_SIZE     = 4
const CENTER_OFFSET = Math.floor(GRID_SIZE / 2) - 1 // = 2

function toggleMark(key: string) {
  marked.value.has(key)
    ? marked.value.delete(key)
    : marked.value.add(key)
}
function isMarked(key: string) {
  return marked.value.has(key)
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
