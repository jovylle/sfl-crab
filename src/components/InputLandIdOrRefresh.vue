<!-- src/components/LandControls.vue -->
<template>
  <div class="">
    <template v-if="!landId">
      <button type="button" class="btn btn-primary btn-sm sm:btn-md" @click="openMainDrawer()">
        Input Land ID
      </button>
    </template>

    <!-- we have a landId? show refresh + clear -->
    <template v-else>
      <RefreshLandData />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import RefreshLandData from '@/components/RefreshLandData.vue'
import { openMainDrawer } from '@/utils/drawerToggle'

// 1) call useRoute() in setup, once
const route = useRoute()

// 2) wrap the param in a computed so it stays reactive
const landId = computed(() => route.params.landId)
</script>