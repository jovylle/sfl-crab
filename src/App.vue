<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 flex flex-col"
  >
    <main class="flex-1 flex flex-col items-center justify-center py-12 px-4">
      <div class="w-full max-w-5xl mx-auto">
        <router-view />
      </div>
    </main>

    <footer class="py-6 text-center text-sm">
      <div class="w-full max-w-5xl mx-auto px-4">
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
  height: 100%;
  margin: 0;
}
</style>
