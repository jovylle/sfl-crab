<script setup>
import { defineProps, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useGridManager } from '@/composables/useGridManager'
import HintPicker from '@/components/HintPicker.vue'

// 1️⃣ Accept the two new props directly
const { showTreasureOrder, treasureOrderMap } = defineProps({
  showTreasureOrder: { type: Boolean, default: false },
  treasureOrderMap:  { type: Array,   default: () => [] },
})

// 2️⃣ Set up route + grid manager
const route  = useRoute()
const landId = route.params.landId || '0'
const grid   = useGridManager(landId)

// 3️⃣ Reactive tiles and picker state
const tiles  = grid.tiles
const picker = ref(null)

// 4️⃣ Click handler to open the hint-picker
function onTileClick(event, index) {
  const container   = event.currentTarget.closest('.contain-please')
  const containerR  = container.getBoundingClientRect()
  const tileR       = event.currentTarget.getBoundingClientRect()
  const centerX     = tileR.left - containerR.left + tileR.width  / 2
  const centerY     = tileR.top  - containerR.top  + tileR.height / 2

  picker.value = { tileIndex: index, x: centerX, y: centerY }
}

// 5️⃣ When user picks a manual hint
function onHintPicked({ tileIndex, hint }) {
  grid.pick(tileIndex, hint)
  picker.value = null
}

// 6️⃣ Helper to resolve your tileImage: must live in setup!
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

<template>
  <div class="contain-please relative">
    <div class="grid w-full p-0.5 gap-0.5 bg-base-300">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile w-full flex items-center bg-base-100 justify-center aspect-square relative"
        :class="tile"
        @click="onTileClick($event, index)"
      >
        <!-- underlying image -->
        <img
          v-if="getTileImage(tile)"
          :src="getTileImage(tile)"
          :alt="getTileImage(tile)"
          class="tile-img"
        />

        <!-- treasure order badge -->
        <span
          v-if="showTreasureOrder && treasureOrderMap[index]"
          class="absolute top-0 right-0
                 bg-base-200 text-xs font-bold
                 w-5 h-5 flex items-center justify-center
                 rounded-full shadow z-10"
        >
          {{ treasureOrderMap[index] }}
        </span>
      </div>
    </div>

    <!-- backdrop to close picker -->
    <div
      v-if="picker"
      class="fixed inset-0 z-40"
      @click="picker = null"
    ></div>

    <!-- hint picker popup -->
    <HintPicker
      v-if="picker"
      :tileIndex="picker.tileIndex"
      :x="picker.x"
      :y="picker.y"
      :hints="[
        'hint-nothing',
        'hint-potential-treasure',
        'hint-potential-treasure2',
        'hint-sand',
        'hint-treasure',
        'hint-crab',
        'hint-unset-white',
        'no-hint-and-show-trash-icon'
      ]"
      @pick="onHintPicked"
    />
  </div>
</template>

<style scoped>
/* ensure each tile is position:relative for the badge */
.tile.relative {
  position: relative;
}
/* your other existing styles */
</style>
