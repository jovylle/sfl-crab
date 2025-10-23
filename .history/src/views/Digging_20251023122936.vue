<template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <!-- Manual Marks clear & Grid -->
    <div
      class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0"
    >
      <div
        class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1"
      >
        <DigToolSection v-model:showTreasureOrder="showTreasureOrder" />

        <!-- Pass the toggle and map down into Grid -->
        <Grid
          :show-treasure-order="showTreasureOrder"
          :treasure-order-map="treasureOrderMap"
        />
      </div>
    </div>

    <div class="space-y-4">
      <TodayPatterns />
      <DigStats />
    </div>
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
import DigStats       from '@/components/DigStats.vue'
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
const defaults = { visitedFarmState: { inventory: {}, desert: { digging: { grid: [] } } } }
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
  const tilesArray = grid.tiles.value;
  const total = tilesArray.length;
  const map = Array.from({ length: total }, () => null);

  const rawGrid = desert.value.digging?.grid || [];

  // Prepare entries with their unified dugAt and grouped tiles
  const entries = rawGrid.map((entry) => {
    if (Array.isArray(entry)) {
      return { dugAt: entry[0]?.dugAt || 0, tiles: entry };
    } else {
      return { dugAt: entry.dugAt, tiles: [entry] };
    }
  });

  // Sort entries by dugAt timestamp
  entries.sort((a, b) => a.dugAt - b.dugAt);

  // Assign order index (shared for grouped digs)
  entries.forEach((entry, orderIndex) => {
    const digNumber = orderIndex + 1;
    entry.tiles.forEach(({ x, y }) => {
      const size = Math.sqrt(total);
      const idx = y * size + x;
      if (Number.isInteger(idx) && idx >= 0 && idx < total) {
        map[idx] = digNumber;
      }
    });
  });

  return map;
});



// 🔁 Auto-reload landData if stale on initial app load
onMounted(() => {
  console.log("App mounted, checking landData for stale visitedFarmState...")
  const landId = route.params.landId
  const today = new Date().toISOString().slice(0, 10)

  if (landId) {
    const raw = JSON.parse(localStorage.getItem(`landData_${landId}`) || '{}')
    const isStale = raw?.date !== today || !raw?.visitedFarmState
    console.log("Checking landData for ID:", raw?.date , "Stale:", raw?.visitedFarmState)
    if (isStale) {
      const { reloadFromServer } = useLandSync({ landId })
      reloadFromServer({ landId })
    }
  }else {
    console.log("No landId provided, skipping stale check.")
  }
})
</script>
