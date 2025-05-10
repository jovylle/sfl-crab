<template>
  <div class="flex flex-col items-center sm:py-6 gap-4">
    <!-- User info & controls -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <UsernameViewer />
        
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

        <!-- Now simply render Grid.vue — it will read from our manager -->
        <Grid />
      </div>
    </div>

    <TodayPatterns />
    <DiggingInfo />
  </div>
</template>

<script setup>
import { watch }            from 'vue'
import { useRoute }         from 'vue-router'

import UsernameViewer       from '@/components/UsernameViewer.vue'
import Grid                 from '@/components/Grid.vue'
import TodayPatterns        from '@/components/TodayPatterns.vue'
import DiggingInfo           from '@/components/DiggingInfo.vue'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'

import { useLandData }      from '@/composables/useLandData'
import { useGridManager }   from '@/composables/useGridManager'

// 1) Grab landId from the URL
const route  = useRoute()
const landId = route.params.landId

// 2) Pull in your land‐blob store so we can watch its grid
const defaults = { state: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert } = useLandData(defaults)

// 3) Initialize your per‐land grid manager
const grid = useGridManager(landId)

// 4) Whenever the server grid changes, re‐populate & re‐overlay hints
watch(
  () => desert.value.digging?.grid,
  apiGrid => apiGrid && grid.update(apiGrid),
  { immediate: true }
)
</script>

<style scoped>
/* keep your Tailwind/custom styling */
</style>
