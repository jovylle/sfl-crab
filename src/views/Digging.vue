<!-- src/views/Digging.vue -->
<template>
  <div class="flex flex-col items-center py-12">
    <h1 class="text-3xl font-bold mb-4">Digging Page</h1>
    <LandControls />
    <UsernameViewer />
    <Grid />
    <button class="btn btn-warning mt-4" @click="gridStore.clearCustomHints()">
      🧹 Clear Manual Marks
    </button>
    <InfoFooter />
  </div>
</template>

<script setup>
import LandControls    from '@/components/LandControls.vue'
import UsernameViewer  from '@/components/UsernameViewer.vue'
import Grid            from '@/components/Grid.vue'
import InfoFooter      from '@/components/InfoFooter.vue'
import { useGridStore } from '@/composables/gridStore'

const gridStore = useGridStore()

</script>
