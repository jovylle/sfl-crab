
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
import { watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import DigToolSection from '@/components/DigToolSection.vue'
import Grid           from '@/components/Grid.vue'
import TodayPatterns  from '@/components/TodayPatterns.vue'
import InfoFooter     from '@/components/InfoFooter.vue'
import { useLandData }    from '@/composables/useLandData'
import { useGridManager } from '@/composables/useGridManager'
import { useLandSync } from '@/composables/useLandSync'

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
/**
 * Updated treasureOrderMap:
 * 1. Flattens any nested arrays inside `digging.grid`.
 * 2. Sorts all digs by `dugAt` (timestamp) so ordering is strictly chronological.
 * 3. Builds a map of length `total` that assigns each (x,y) cell its "dig order index".
 */
const treasureOrderMap = computed(() => {
  const tilesArray = grid.tiles.value;   // should be a flat Array of all cells
  const total = tilesArray.length;
  const map = Array.from({ length: total }, () => null);

  // get raw grid data (may include nested arrays)
  const rawGrid = desert.value.digging?.grid || [];

  // flatten any nested arrays into one single array of tile‐objects
  const allDigs = rawGrid.reduce((acc, entry) => {
    if (Array.isArray(entry)) {
      return acc.concat(entry);
    } else {
      acc.push(entry);
      return acc;
    }
  }, []);

  // sort by dugAt (older first → lower index)
  allDigs.sort((a, b) => a.dugAt - b.dugAt);

  // assign order based on sorted index (i + 1)
  allDigs.forEach((tile, sortedIndex) => {
    const x = tile.x;
    const y = tile.y;
    const size = Math.sqrt(total);
    const idx = y * size + x;
    if (Number.isInteger(idx) && idx >= 0 && idx < total) {
      map[idx] = sortedIndex + 1;
    }
  });

  return map;
});


// 🔁 Auto-reload landData if stale on initial app load
onMounted(() => {
  console.log("App mounted, checking landData for stale state...")
  const landId = route.params.landId
  const today = new Date().toISOString().slice(0, 10)

  if (landId) {
    const raw = JSON.parse(localStorage.getItem(`landData_${landId}`) || '{}')
    const isStale = raw?.date !== today || !raw?.state
    console.log("Checking landData for ID:", raw?.date , "Stale:", raw?.state)
    if (isStale) {
      const { reloadFromServer } = useLandSync({ landId })
      reloadFromServer({ landId })
    }
  }else {
    console.log("No landId provided, skipping stale check.")
  }
})

</script>
