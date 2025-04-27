<!-- src/components/LandControls.vue -->
<template>
  <div class="flex flex-col items-center mt-8">
    <!-- no landId? show input loader -->
    <LandLoader v-if="!landId" />

    <!-- we have a landId? show refresh + clear -->
    <template v-else>
      <RefreshLandData />
    </template>
  </div>
</template>

<script setup>
import LandLoader from '@/components/LandLoader.vue'
import RefreshLandData from '@/components/RefreshLandData.vue'
import { useRoute } from 'vue-router'

const landId  = useRoute().params.landId  // string or undefined

</script>
