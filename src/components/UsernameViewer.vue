<template>
  <div v-if="username" class="mt-6 text-center">
    <h2 class="text-xl font-bold text-gray-800">
      👤 Welcome, {{ username }}!
    </h2>
  </div>
</template>

<script setup>
import { useLandData } from '@/composables/useLandData'

const { username } = useLandData()
</script>

<style scoped>
/* Optional small styles */
</style>
