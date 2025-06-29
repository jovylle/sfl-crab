<template>
  <div class="contain-please relative mt-1 sm:mt-4 mx-auto">
    <!-- COL LABELS OVERLAY -->
    <div class="overlay-cols text-[0.45rem] sm:text-[0.5rem] lg:text-xs">
      <div
        v-for="L in colLabels"
        :key="L"
        class="overlay-cell justify-center items-end"
      >
        {{ L }}
      </div>
    </div>

    <!-- ROW LABELS OVERLAY -->
    <div
      class="overlay-rows text-base-content text-[0.45rem] sm:text-[0.5rem] lg:text-xs"
    >
      <div
        v-for="N in rowLabels"
        :key="N"
        class="overlay-cell justify-end items-center"
      >
        {{ N }}
      </div>
    </div>

    <div class="grid w-full p-0.5 gap-0.5 bg-base-300 dark:bg-slate-500">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile w-full flex items-center bg-base-100 justify-center aspect-square relative"
        :class="normalizeTile(tile)"
        @click="onTileClick($event, index)"
      >
        <!-- underlying image -->
        <img
          v-if="getTileImage(normalizeTile(tile))"
          :src="getTileImage(normalizeTile(tile))"
          alt="treasure"
          class="tile-img"
        />

        <!-- treasure order badge -->
        <span
          v-if="showTreasureOrder && treasureOrderMap[index]"
          class="absolute top-0 right-0
            w-full h-full
            transform origin-top-right scale-[0.33333]
            flex items-center justify-center
            bg-base-200 rounded-full shadow
            text-2xl md:text-3xl p-1 font-bold
            pointer-events-none overflow-hidden"
        >
          {{ treasureOrderMap[index] }}
        </span>
      </div>
    </div>

    <!-- backdrop to close picker -->
    <div v-if="picker" class="fixed inset-0 z-40" @click="picker = null"></div>

    <!-- hint picker popup -->
    <HintPicker
      v-if="picker"
      :tileIndex="picker.tileIndex"
      :x="picker.x"
      :y="picker.y"
      :hints="[
        'hint-red-dot',
        'hint-potential-treasure',
        'hint-potential-treasure2',
        'hint-sand tileImage:sand',
        'hint-treasure',
        'hint-crab tileImage:crab',
        'hint-nothing',
        'no-hint-and-show-trash-icon',
        'hint-crab-eyes-maybe',
      ]"
      @pick="onHintPicked"
      :possibleTreasures="possibleTreasures"
    />

    <!-- BottomGridInfo component -->
    <BottomGridInfo />
  </div>
</template>

<script setup>
import { defineProps, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGridManager } from '@/composables/useGridManager'
import HintPicker from '@/components/HintPicker.vue'
import BottomGridInfo from './BottomGridInfo.vue'

import { useTodayTreasureNames } from "@/composables/useTodayTreasureNames";

const possibleTreasures = useTodayTreasureNames();
console.log("Trigger computed value:", possibleTreasures.value); // this seems to forcely trigger the computed value
// your existing props
const { showTreasureOrder, treasureOrderMap } = defineProps({
  showTreasureOrder: { type: Boolean, default: false },
  treasureOrderMap:  { type: Array,   default: () => [] },
})

// init grid manager
const route  = useRoute()
const landId = route.params.landId || '0'
const grid   = useGridManager(landId)

// reactive tiles & picker
const tiles  = grid.tiles
const picker = ref(null)

// static labels for overlays
const colLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) =>
    String.fromCharCode(65 + i)  // A–J
  )
)
const rowLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) => i + 1)  // 1–10
)

// click handler
function onTileClick(event, index) {
  const container   = event.currentTarget.closest('.contain-please')
  const containerR  = container.getBoundingClientRect()
  const tileR       = event.currentTarget.getBoundingClientRect()
  const centerX     = tileR.left - containerR.left + tileR.width  / 2
  const centerY     = tileR.top  - containerR.top  + tileR.height / 2

  picker.value = { tileIndex: index, x: centerX, y: centerY }
}

function onHintPicked({ tileIndex, hint }) {
  grid.pick(tileIndex, hint)
  picker.value = null
}


// image helper
function getTileImage(tile) {
  if (!Array.isArray(tile)) return null
  const match = tile.find(
    cls => typeof cls === 'string' && cls.includes('tileImage:')
  )
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}

function normalizeTile(tile) {
  if (Array.isArray(tile)) return tile;
  return String(tile).split(" ");
}

</script>

<style scoped>
.contain-please {
  position: relative;
  /* carve out 1-tile space (10%) for overlays */
  --label-size: 10%;
  --badge-size: 3%;
  padding-top: 0px;
  padding-left: 0px;
}

.overlay-cols {
  position: absolute;
  top: calc(var(--label-size) * -1 + 1px);
  left: 0;
  width: calc(100%);
  height: var(--label-size);
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  pointer-events: none;
}

.overlay-rows {
  position: absolute;
  top: 0;
  left: calc(var(--label-size) * -1 - 2px);
  width: var(--label-size);
  height: calc(100%);
  display: grid;
  grid-template-rows: repeat(10, 1fr);
  pointer-events: none;
}

.overlay-cell {
  display: flex;
  user-select: none;
}

/* keep your existing tile-relative rule */
.tile {
  position: relative;
}

.badge {
}
</style>
