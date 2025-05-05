<template>
  <div v-if="username" class="">
    <h2 class="text-xl font-bold">
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
