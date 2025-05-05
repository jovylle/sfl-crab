<template>
  <div
    id="app"
    class="min-h-screen bg-base-100 text-base-content flex flex-col transition-colors duration-300"
  >
    <MainDrawer />
    <main class="flex-1 flex flex-col items-center justify-center py-6 sm:py-12 px-4">
      <div class="w-full max-w-screen-lg mx-auto text-center">
        <!-- <h1 class="text-4xl font-bold text-primary">Welcome to SFL Crab</h1> -->
        <!-- <p class="mt-2 text-secondary">Lightsoft / Darkdim themes in action</p> -->
        <router-view />
      </div>
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