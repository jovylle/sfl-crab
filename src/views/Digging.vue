<!-- src/views/Digging.vue -->
<template>
  <div class="flex flex-col items-center sm:py-6 gap-4">
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <UsernameViewer />
        <LandControls />
      </div>
    </div>
    <div class="card bg-base-100 shadow-sm w-full max-w-xl">
      <div class="card-body">
        <button class="btn btn-warning mb-4 max-w-[300px] mx-auto" @click="gridStore.clearCustomHints()">
          🧹 Clear Manual Marks
        </button>
        <Grid />
      </div>
    </div>
    <TodayPatterns />
    <InfoFooter />
  </div>
</template>

<script setup>
import LandControls    from '@/components/LandControls.vue'
import UsernameViewer  from '@/components/UsernameViewer.vue'
import Grid            from '@/components/Grid.vue'
import TodayPatterns            from '@/components/TodayPatterns.vue'
import InfoFooter      from '@/components/InfoFooter.vue'
import { useGridStore } from '@/composables/gridStore'
import { provide } from 'vue'

const gridStore = useGridStore()
provide('gridStore', gridStore)

</script>
