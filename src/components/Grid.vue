<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useGridManager } from '@/composables/useGridManager'
import HintPicker from '@/components/HintPicker.vue'

const route = useRoute()
const landId = route.params.landId || '0'
const grid = useGridManager(landId)

// reactive picker state
const picker = ref(null)

// click handler: open the picker instead of cycling immediately
function onTileClick(event, index) {
  // find the positioning container
  const container = event.currentTarget.closest('.contain-please')
  const containerRect = container.getBoundingClientRect()

  // get the clicked tile's bounding box
  const tileRect = event.currentTarget.getBoundingClientRect()

  // compute the center of the tile within the container
  const centerX = tileRect.left - containerRect.left + tileRect.width  / 2
  const centerY = tileRect.top  - containerRect.top  + tileRect.height / 2

  // set the picker state
  picker.value = {
    tileIndex: index,
    x: centerX,
    y: centerY
  }
}


// when a hint is picked, call cycle with hint
function onHintPicked({ tileIndex, hint }) {
  // hint is now the class string (e.g. 'hint-crab') or '' to clear
  grid.cycle(tileIndex, hint)
  picker.value = null
}

const tiles     = grid.tiles
const cycleHint = grid.cycle // for fallback or other use
</script>

<template>
  <div class="contain-please relative">
    <div class="grid w-full border border-base-300">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile w-full border border-base-300 flex items-center justify-center aspect-square outline outline-base-300"
        :class="tile"
        @click="onTileClick($event, index)"
      >
        <img
          v-if="getTileImage(tile)"
          :src="getTileImage(tile)"
          :alt="getTileImage(tile)"
          class="tile-img"
        />
      </div>
    </div>
    <div v-if="picker" class="fixed inset-0 z-40" @click="picker = null"></div>
    <!-- mount the picker -->
    <HintPicker
      v-if="picker"
      :tileIndex="picker.tileIndex"
      :x="picker.x"
      :y="picker.y"
      :hints="[
        'hint-sand',
        'hint-crab',
        'hint-treasure',
        'hint-nothing',
        'hint-unset-white',
        'hint-potential-treasure',
      ]"
      @pick="onHintPicked"
    />
  </div>
</template>

<script>
// keep your getTileImage helper here (or import from utils)
function getTileImage(tile) {
  if (!Array.isArray(tile)) return null
  const match = tile.find(
    cls => typeof cls === 'string' && cls.startsWith('tileImage:')
  )
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}
</script>

<style scoped>
/* your existing styles */
</style>
