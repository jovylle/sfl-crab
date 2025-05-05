<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 text-base-content flex flex-col transition-colors duration-300"
  >
    <MainDrawer />
    <main class="py-6 sm:py-12 px-4 w-full max-w-screen-lg mx-auto text-center">
      <router-view />
    </main>
    <footer class="py-6 text-center text-sm">
      <div class="w-full max-w-screen-lg mx-auto px-4">
        By the community for community Tool
      </div>
    </footer>
  </div>
</template>
<script setup>
import MainDrawer from './components/MainDrawer.vue'
</script>