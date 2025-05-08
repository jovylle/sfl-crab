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
            @click="gridStore.clearCustomHints()"
          >
            🧹 Clear Marks
          </button>
          <button type="button">
            <InputLandIdOrRefresh />
          </button>
        </div>

        <!-- Your Grid.vue will pull from the singleton store internally -->
        <Grid
        />
      </div>
    </div>

    <TodayPatterns />
    <InfoFooter />
  </div>
</template>

<script setup>
import { watch }        from 'vue'
import { useRoute }     from 'vue-router'

import UsernameViewer  from '@/components/UsernameViewer.vue'
import Grid            from '@/components/Grid.vue'
import TodayPatterns   from '@/components/TodayPatterns.vue'
import InfoFooter      from '@/components/InfoFooter.vue'

import { useLandData }   from '@/composables/useLandData'
import { useGridStore }  from '@/composables/useGridStore'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'

// 1) Grab landId from the URL
const route = useRoute()
const landId = route.params.landId

// 2) Load your cached server data (with reload() on refresh)
const defaults = { state: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert } = useLandData(defaults)

// 3) Initialize your singleton grid store
const gridStore = useGridStore(landId)

watch(
  () => desert.value.digging?.grid,
  g => g && gridStore.updateGridFromData(g),
  { immediate: true }
)
</script>

<style scoped>
/* keep your Tailwind-based or custom styling */
</style>
