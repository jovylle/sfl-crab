<!-- src/components/InfoFooter.vue -->
<template>
  <section class="card bg-base-100">
    <div class="card-body space-y-4">
      <div v-if="showWhatIsThis">
        <h3 class="text-xl font-bold flex items-center">
          <span class="text-2xl mr-2">💡</span>
           What is this?
        </h3>
        <p class="mt-2">
          This is an alternative to
          <a
            href="https://sfl.world/land/1/treasures"
            target="_blank"
            rel="noopener"
            class="link link-primary"
          >
            sfl.world/land/1/treasures
          </a>
          digging guide of sfl.world. A personal tool to assist Sunflower Land players
          with digging. You can visualize hint patterns (sand, crab, treasure)
          and simulate digging logic with interactive tiles.
        </p>
      </div>

      <div v-if="showFeatures">
        <h4 class="text-lg font-semibold">🚀 Features:</h4>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>Auto-load from Land ID (via API)</li>
          <li>Manual hint cycling with neighbor propagation</li>
          <li>Live grid state, reset, and refresh tools</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  showWhatIsThis: { type: Boolean, default: true },
  showFeatures: { type: Boolean, default: true },
})
</script>

<style scoped>
/* nothing extra—DaisyUI utilities handle the styling */
</style>
