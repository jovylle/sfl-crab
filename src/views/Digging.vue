
<template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <!-- Manual Marks clear & Grid -->
    <div
      class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0"
    >
      <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">
        <DigToolSection v-model:showTreasureOrder="showTreasureOrder" />

        <!-- Pass the toggle and map down into Grid -->
        <Grid
          :show-treasure-order="showTreasureOrder"
          :treasure-order-map="treasureOrderMap"
        />
      </div>
    </div>

    <TodayPatterns />
  </div>

  <div>
    <InfoFooter />
  </div>
</template>
<script setup>
import { watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DigToolSection from '@/components/DigToolSection.vue'
import Grid           from '@/components/Grid.vue'
import TodayPatterns  from '@/components/TodayPatterns.vue'
import InfoFooter     from '@/components/InfoFooter.vue'
import { useLandData }    from '@/composables/useLandData'
import { useGridManager } from '@/composables/useGridManager'

// 1) landId and persistent toggle
const route = useRoute()
const landId = route.params.landId || 'guest'
const showTreasureOrder = useLocalStorage(
  `showTreasureOrder-${landId}`, false
)

// 2) grid engine + API watch
const grid = useGridManager(landId)
const defaults = { state: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert } = useLandData(defaults)
watch(
  () => desert.value.digging?.grid,
  rawGrid => {
    if (!rawGrid) return
    // flatten any nested arrays into one list of tile-digs
    const flatGrid = rawGrid.flat(Infinity)
    grid.update(flatGrid)
  },
  { immediate: true }
)

// ── 4) Build a 1D map (tileIndex → 1-based treasure order)
const treasureOrderMap = computed(() => {
  // grab the reactive tiles array
  const tilesArray = grid.tiles.value   // should be an actual Array
  const total = tilesArray.length       // number of cells

  // build a guaranteed Array of length `total` filled with nulls
  const map = Array.from({ length: total }, () => null)

  // grab your digs (guarding in case it’s not there yet)
  const digs = desert.value.digging?.grid || []

  digs.forEach((tile, i) => {
    // treat anything that isn’t Sand or Crab as treasure
    if (!tile.items?.Sand && !tile.items?.Crab) {
      const x = tile.x
      const y = tile.y
      // infer width/height
      const size = Math.sqrt(total)
      const idx = y * size + x
      if (Number.isInteger(idx) && idx >= 0 && idx < total) {
        map[idx] = i + 1
      }
    }
  })

  return map
})
</script>
