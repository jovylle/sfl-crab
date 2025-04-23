<!-- src/components/InfoFooter.vue -->
<template>
  <section class="info-section">
    <p class="instructions">
      💡 <strong>What is this?</strong><br />
      A personal tool to assist Sunflower Land players with digging.
      You can visualize hint patterns (sand, crab, treasure) and simulate digging logic with interactive tiles.
    </p>

    <p class="instructions">
      🚀 Features:
    </p>
    <ul style="max-width: 400px; margin: 0 auto;">
      <li>Auto-load from Land ID (via API)</li>
      <li>Manual hint cycling with neighbor propagation</li>
      <li>Live grid state, reset, and refresh tools</li>
    </ul>

    <p class="instructions">
      💬 Send feedback, suggestions, or bug reports:<br />
      <a
        href="https://forms.gle/zJayANHdjJ2EQvyB9"
        target="_blank"
        rel="noopener"
        class="github-link"
      >
        Feedback Form
      </a>
    </p>
  </section>
</template>
