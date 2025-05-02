<!-- src/components/LandControls.vue -->
<template>
  <div class="flex flex-col items-center mt-4 sm:mt-8">
    <!-- no landId? show input loader -->
    <LandLoader v-if="!landId" />

    <!-- we have a landId? show refresh + clear -->
    <template v-else>
      <RefreshLandData />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import LandLoader      from '@/components/LandLoader.vue'
import RefreshLandData from '@/components/RefreshLandData.vue'

// 1) call useRoute() in setup, once
const route = useRoute()

// 2) wrap the param in a computed so it stays reactive
const landId = computed(() => route.params.landId)
</script>