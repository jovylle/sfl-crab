<!-- src/components/InfoFooter.vue -->
<template>
  <footer class="py-6 text-center text-sm bg-base-100">
    <div class="w-full max-w-screen-lg mx-auto px-4 space-y-2">
      <p>By the community for the community Tool</p>

      <!-- Quick Links -->
      <div class="space-x-4">
        <a
          href="https://sfl-digging.uft1.com/"
          target="_blank"
          rel="noopener"
          class="link link-secondary"
        >
          Official Live Server
        </a>
        |
        <a
          href="https://sfl-development.uft1.com/"
          target="_blank"
          rel="noopener"
          class="link link-secondary"
        >
          Development Site
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
// no script logic needed
</script>

<style scoped>
/* If you want a subtle border on top: */
footer {
  border-top: 1px solid var(--p-base-content) !important;
}
</style>
