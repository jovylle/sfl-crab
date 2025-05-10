<!-- src/components/LandControls.vue -->
<template>
  <div>
    <!-- No landId? Show the loader -->
    <LandLoader v-if="!landId" />

    <!-- We have a landId → show refresh + clear -->
    <div v-else class="space-x-2">
      <RefreshLandData />
      <button
        type="button"
        class="btn btn-sm btn-error tooltip"
        data-tip="Clear Land ID"
        @click="clearLandId"
      >
        Clear ID
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LandLoader      from '@/components/LandLoader.vue'
import RefreshLandData from '@/components/RefreshLandData.vue'

const route  = useRoute()
const router = useRouter()

// landId is undefined on the no-id pages
const landId = computed(() => route.params.landId)

// Clear the ID, but stay on whatever “mode” we’re in
function clearLandId() {
  if (route.name === 'Digging') {
    // we’re on /:landId/digging → go to /digging
    router.push({ name: 'Digging' })
  } else {
    // default to details no-id
    router.push({ name: 'LandDetailsNoId' })
  }
}
</script>
