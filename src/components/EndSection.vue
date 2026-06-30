<!-- src/components/EndSection.vue -->
<template>
  <section class="card bg-base-200 shadow-md p-4 text-sm space-y-4">
    <div class="card-body space-y-2">
      <DiggingAssistantLinks />
      <div class="pt-4 border-t border-base-300">
        <h4 class="text-lg font-semibold">🚀 Want to contribute?</h4>
        <p class="text-sm">
          Fork the repo on GitHub:<br />
          <a href="https://github.com/jovylle/sfl-crab" class="link link-secondary">github.com/jovylle/sfl-crab</a><br/>
          Create a branch, make your changes, and open a Pull Request.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import DiggingAssistantLinks from '@/components/DiggingAssistantLinks.vue'
</script>
