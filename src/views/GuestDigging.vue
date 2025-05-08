<!-- src/views/GuestDigging.vue -->
<template>
  <div class="flex flex-col items-center sm:py-6 gap-4">
    <!-- User info & controls -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <UsernameViewer :name="username" />
      </div>
    </div>

    <!-- Manual Marks clear & Grid -->
    <div class="card bg-base-100 shadow-sm w-full max-w-xl">
      <div class="card-body">
        <div class="flex gap-4 mb-4 justify-center">
          <button
            class="btn btn-warning tooltip"
            data-tip="🧹 Clear all custom marks"
            @click="grid.clear()"
          >
            🧹 Clear Marks
          </button>
          <InputLandIdOrRefresh />
        </div>

        <!-- Grid.vue will pull from our grid manager internally -->
        <Grid />
      </div>
    </div>

    <TodayPatterns :patterns="patternKeys" />
    <InfoFooter />
  </div>
</template>

<script setup>
import { watch }            from 'vue'
import { useRoute }         from 'vue-router'

import UsernameViewer       from '@/components/UsernameViewer.vue'
import Grid                 from '@/components/Grid.vue'
import TodayPatterns        from '@/components/TodayPatterns.vue'
import InfoFooter           from '@/components/InfoFooter.vue'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'

import { useLandData }      from '@/composables/useLandData'
import { useGridManager }   from '@/composables/useGridManager'

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
