<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 flex flex-col"
  >
    <main class="flex-1 flex flex-col items-center justify-center py-6 sm:py-12 px-4">
      <div class="w-full max-w-screen-lg mx-auto">
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
// no changes here
</script>

<style>
html,
body,
#app {
  min-height: 100vh;
  margin: 0;
}
</style>
