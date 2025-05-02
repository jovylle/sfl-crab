<template>
  <section class="py-12 flex flex-col items-center px-4">
    <div class="w-full max-w-screen-lg mx-auto text-center">
      <h1 class="text-3xl font-bold">Land Profile</h1>
      <p class="mt-4 text-xl">Land ID: {{ landId }}</p>
    </div>
  </section>
</template>

<script setup>
import { useRoute } from 'vue-router'

const landId = useRoute().params.landId
</script>

<style scoped>
/* Optional: tweak typography or spacing here */
</style>
