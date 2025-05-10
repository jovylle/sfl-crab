<!-- src/views/Home.vue -->
<template>
  <section class="py-12 flex flex-col items-center px-4">
    <div class="w-full max-w-screen-lg mx-auto">
      <h1 class="text-5xl font-bold mb-8 text-center">
        Welcome to SFL Digging Assistant
      </h1>

      <div class="flex flex-wrap justify-center gap-6">
        <!-- Digging Card -->
        <router-link
          to="/digging"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200 w-64"
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

        <!-- Details Card -->
        <router-link
          to="/details"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200 w-64"
        >
          <figure class="p-4">
            <div
              class="w-full h-32 flex items-center justify-center bg-base-200 rounded-lg"
            >
              <span class="text-6xl">📋</span>
            </div>
          </figure>
          <div class="card-body items-center text-center">
            <h2 class="card-title">Details</h2>
            <p>View raw land data</p>
            <div class="card-actions">
              <button class="btn btn-primary">Go Details</button>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
// No extra logic needed — links are static.
</script>

<style scoped>
/* Increase gap on smaller screens */
@media (max-width: 640px) {
  .flex-wrap {
    gap: 1rem;
  }
}
</style>
