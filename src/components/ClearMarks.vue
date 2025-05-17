<template>
  <div class="flex gap-4 mb-4 justify-center">
    <button
      class="btn btn-warning tooltip btn-sm sm:btn-md"
      data-tip="🧹 Clear all custom marks"
      @click="grid.clear()"
    >
      🧹 Clear Marks
    </button>
    <InputLandIdOrRefresh />
  </div>
</template>
<script setup>

import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'
import { useGridManager }   from '@/composables/useGridManager'
import { useRoute }         from 'vue-router'

// 1) Choose a key: if there's no landId, use "0" (guest key)
const route  = useRoute()
const landId = route.params.landId || '0'
// 3) Create (or reuse) the grid manager under "0"
const grid = useGridManager(landId)
</script>
