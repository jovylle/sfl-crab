<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 bg-cross-lines text-base-content flex flex-col transition-colors duration-300"
  >
    <MainDrawer />
    <main class="py-6 sm:py-8 px-4 w-full max-w-screen-lg mx-auto text-center flex-1">
      <router-view />
    </main>
    <Footer />
  </div>
</template>
<script setup>
import MainDrawer from './components/MainDrawer.vue'
import Footer from '@/components/Footer.vue'
</script>