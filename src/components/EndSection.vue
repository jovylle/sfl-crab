<!-- src/components/EndSection.vue -->
<template>
  <section class="card bg-base-200 shadow-md p-4 text-sm space-y-4">
    <div class="card-body space-y-2">
      <DiggingAssistantLinks />

      <div class="pt-4 border-t border-base-300">
        <h4 class="text-lg font-semibold">☕ Support d1g.uk</h4>
        <p class="text-sm text-base-content/80">
          Free forever. Optional tips help pay hosting.
        </p>
        <a
          :href="KOFI_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary btn-sm mt-2"
        >
          Support on Ko-fi
        </a>
      </div>

      <div class="pt-4 border-t border-base-300">
        <h4 class="text-lg font-semibold">🚀 Want to contribute?</h4>
        <p class="text-sm">
          Fork the repo on GitHub:<br />
          <a href="https://github.com/jovylle/sfl-crab" class="link link-secondary">github.com/jovylle/sfl-crab</a><br/>
          Create a branch, make your changes, and open a Pull Request.<br />
          To report bugs or request features, please open an issue:<br />
          <a href="https://github.com/jovylle/sfl-crab/issues" class="link link-secondary">github.com/jovylle/sfl-crab/issues</a><br />
        </p>
      </div>

      <div class="pt-4 border-t border-base-300">
        <h4 class="text-lg font-semibold">💬 Send feedback, suggestions, or bug reports:</h4>
        <a
          href="https://forms.gle/zJayANHdjJ2EQvyB9"
          target="_blank"
          rel="noopener"
          class="btn btn-link btn-sm mt-2"
        >
          Feedback Form
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import DiggingAssistantLinks from '@/components/DiggingAssistantLinks.vue'
import { KOFI_URL } from '@/config/support.js'
</script>
