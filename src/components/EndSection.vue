<!-- src/components/EndSection.vue -->
<template>
  <section class="card bg-base-200 shadow-md p-4 text-sm space-y-4">
    <div class="card-body space-y-2">
      <h5 class="font-bold text-base">Official Sunflower Land Utility Links</h5>

      <div>
        <span class="italic">Production:</span>
        <a href="https://sfl.uft1.com" class="link link-secondary ml-2">sfl.uft1.com</a>
        <span class="mx-1">|</span>
        <a href="https://sfl-digging.uft1.com" class="link link-secondary">sfl-digging.uft1.com</a>
        <span class="mx-1">|</span>
        <a href="https://d1g.uk" class="link link-secondary">d1g.uk</a>
      </div>

      <div>
        <span class="italic">Development / Beta:</span>
        <a href="https://sfl-development.uft1.com" class="link link-secondary ml-2">sfl-development.uft1.com</a>
        <span class="mx-1">|</span>
        <a href="https://development.d1g.uk" class="link link-secondary">development.d1g.uk</a>
        <span class="mx-1">|</span>
        <a href="https://beta.d1g.uk" class="link link-secondary">beta.d1g.uk</a>
      </div>

      <!-- New: Contribute & Report Issues -->
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

      <!-- New: Feedback Form -->
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
// no script logic needed
</script>

<style scoped>
/* styling handled by Tailwind + DaisyUI */
</style>
