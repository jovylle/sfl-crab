<!-- src/components/MainDrawer.vue -->
<template>
  <div class="drawer drawer-end z-50">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <!-- FAB Toggle Button -->
    <div class="fixed bottom-4 right-4">
      <label
        for="main-drawer"
        class="btn btn-primary btn-lg btn-circle shadow-xl text-2xl"
      >
        ☰
      </label>
    </div>

    <!-- Drawer Content -->
    <div class="drawer-side">
      <label for="main-drawer" class="drawer-overlay"></label>
      <div class="menu p-4 w-80 min-h-full bg-base-100 text-base-content">
        <h2 class="text-xl font-bold mb-4">Menu</h2>
        <ul class="space-y-2">
          <!-- <li><button class="btn btn-sm btn-block">Theme Toggle</button></li>
          <li><button class="btn btn-sm btn-block">Reset Game</button></li>
          <li><button class="btn btn-sm btn-block">Show Legend</button></li> -->
          <!-- Add more controls here -->
        </ul>
        <div>
            <ThemeToggle />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// optional: inject actions via props or composables later
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>
