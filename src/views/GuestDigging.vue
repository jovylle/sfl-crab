<!-- src/views/GuestDigging.vue -->
<template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <!-- Manual Marks clear & Grid -->
    <div class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0">
      <div class="card-body [@media(max-width:639px)]:p-3">
        <ClearMarks />

        <!-- Grid.vue will pull from our grid manager internally -->
        <Grid />
      </div>
    </div>
    
    <TodayPatterns :patterns="patternKeys" />
    <!-- <InfoFooter /> -->
  </div>
</template>

<script setup>
import { watch }            from 'vue'
import { useRoute }         from 'vue-router'

import Grid                 from '@/components/Grid.vue'
import TodayPatterns        from '@/components/TodayPatterns.vue'
import InfoFooter           from '@/components/InfoFooter.vue'

import { useLandData }      from '@/composables/useLandData'
import { useGridManager }   from '@/composables/useGridManager'
import ClearMarks from '@/components/ClearMarks.vue'

// 1) Choose a key: if there's no landId, use "0" (guest key)
const route  = useRoute()
const landId = route.params.landId || '0'

// 2) Get the reactive land‐blob slices (grid, username, patterns)
const {
  username,
  patternKeys,
  grid: landGrid
} = useLandData()    // <— no parameters here!

// 3) Create (or reuse) the grid manager under "0"
const grid = useGridManager(landId)

// 4) Whenever that underlying grid changes, update our manager
watch(
  () => landGrid?.value,
  apiGrid => {
    if (apiGrid) {
      grid.update(apiGrid)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* your existing styles */
</style>
