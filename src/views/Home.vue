<!-- src/views/Home.vue -->
<template>
  <section class="py-12 flex flex-col items-center px-4">
    <div class="w-full max-w-5xl mx-auto">
      <h1 class="text-5xl font-bold mb-8 text-center">
        Welcome to SFL Digging Assistant
      </h1>
      <div class="flex justify-center space-x-2">
      <!-- <div class="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 justify-items-center justify-center space-x-2"> -->
        <!-- Digging Card -->
        <router-link
          to="/digging"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200 h-auto max-h-80 w-64"
        >
          <figure class="p-4">
            <div
              class="w-full h-32 flex items-center justify-center bg-base-200 rounded-lg"
            >
              <span class="text-6xl">⛏️</span>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h2 class="card-title">Digging</h2>
            <p>Start uncovering treasures!</p>
            <div class="card-actions">
              <button class="btn btn-primary">Go Dig</button>
            </div>
          </div>
        </router-link>

        <!-- Placeholder Card 1
        <div class="card bg-base-100 shadow-xl h-auto max-h-80 w-64">
          <figure class="p-4">
            <div
              class="w-full h-32 flex items-center justify-center bg-base-200 rounded-lg"
            >
              <span class="text-6xl">🚧</span>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h2 class="card-title">Coming Soon</h2>
            <p>Under construction</p>
          </div>
        </div> -->

        <!-- Placeholder Card 2 -->
        <!-- <div class="card bg-base-100 shadow-xl h-auto max-h-80 w-64">
          <figure class="p-4">
            <div
              class="w-full h-32 flex items-center justify-center bg-base-200 rounded-lg"
            >
              <span class="text-6xl">🚧</span>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h2 class="card-title">Coming Soon</h2>
            <p>Under construction</p>
          </div>
        </div> -->

        <!-- Placeholder Card 3 -->
        <!-- <div class="card bg-base-100 shadow-xl h-auto max-h-80 w-64">
          <figure class="p-4">
            <div
              class="w-full h-32 flex items-center justify-center bg-base-200 rounded-lg"
            >
              <span class="text-6xl">🚧</span>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h2 class="card-title">Coming Soon</h2>
            <p>Under construction</p>
          </div>
        </div> -->
      </div>
    </div>
  </section>
</template>

<script setup>
// no extra logic needed here
</script>

<style scoped>
/* all horizontal padding is coming from the section’s px-4 */
</style>
