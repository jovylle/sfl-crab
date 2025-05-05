<!-- src/views/Digging.vue -->
<template>
  <div class="flex flex-col items-center sm:py-6">
    <!-- <h1 class="text-3xl font-bold mb-4">Digging Page</h1> -->
    <UsernameViewer />
    <LandControls />
    <Grid />
    <button class="btn btn-warning mt-4" @click="gridStore.clearCustomHints()">
      🧹 Clear Manual Marks
    </button>
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
