<!-- filepath: /Users/jovylle.bermudez/fore/lab/sfl-crab/src/App.vue -->
<template>
  <div class="my-container">
    <header class="site-header">
      <h1>SFL Digging Assistant V2</h1>
    </header>

    <main class="site-main">
       
      <LandLoader />
      <RefreshLandData />
      <UsernameViewer />
      <Grid />
      <button class="btn btn-warning mt-4" @click="gridStore.clearCustomHints()">
        🧹 Clear Manual Marks
      </button>
      <InfoFooter />
    </main>
    <footer class="site-footer">
      <p>
        &copy; 2025 - By the community for community Tool -
        <a
          href="https://github.com/jovylle"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
        >
          git
        </a>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { gridStore } from '@/composables/gridStore'
import LandLoader         from '@/components/LandLoader.vue'
import RefreshLandData    from '@/components/RefreshLandData.vue'
import UsernameViewer     from '@/components/UsernameViewer.vue'
import Grid               from '@/components/Grid.vue'
import InfoFooter         from '@/components/InfoFooter.vue'
</script>

