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
import { getLandIdFromUrl } from '@/utils/getLandId'
import LandLoader from '@/components/LandLoader.vue'
import RefreshLandData from '@/components/RefreshLandData.vue'

const landId = getLandIdFromUrl()

</script>
