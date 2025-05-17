<template>
  <!-- <div v-if="username" class="">
    <h2 class="text-xl font-bold">
      👤 Welcome, {{ username }}!
    </h2>
  </div>
  <div v-else class="">
    <h2 class="text-xl font-bold">
      Welcome to the Digging Assitant!
    </h2>
  </div> -->
</template>

<script setup>
import { useLandData } from '@/composables/useLandData'
import { useRoute } from 'vue-router'

const route = useRoute()
const { username } = useLandData(route.params.landId)
</script>

<style scoped>
/* Optional small styles */
</style>
