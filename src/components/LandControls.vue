<!-- src/components/LandControls.vue -->
<template>
  <div>
    <!-- No landId? Show input loader -->
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

// Reactive landId (undefined when on /digging)
const landId = computed(() => route.params.landId)

// Redirect back to the “no-ID” digging page
function clearLandId() {
  router.push({ name: 'Digging' })
}
</script>
