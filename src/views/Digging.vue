<!-- src/views/Digging.vue -->
<template>
  <div class="flex flex-col items-center sm:py-6 gap-4">
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <UsernameViewer />
        <LandControls />
      </div>
    </div>
    <TodayPatterns />
    <div class="card bg-base-100 shadow-sm w-full max-w-xl">
      <div class="card-body">
        <Grid />
        <button class="btn btn-warning mt-4" @click="gridStore.clearCustomHints()">
          🧹 Clear Manual Marks
        </button>
      </div>
    </div>
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
