<!-- filepath: /Users/jovylle.bermudez/fore/lab/sfl-crab/src/App.vue -->
<template>
  <div class="container">
    <header class="site-header">
      <h1>SFL Digging Assistant V2</h1>
    </header>

    <main class="site-main">
      <!-- Land ID Input -->
      <div v-if="!landId">
        <input
          v-model="inputLandId"
          placeholder="Enter Land ID"
          class="land-id-input"
        />
        <button @click="submitLandId(inputLandId)">Submit</button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>

      <!-- Buttons -->
      <div v-else>
        <button @click="clearLandId">Change Land ID</button>
        <button
          @click="refreshData"
          :disabled="isRefreshing"
        >
          {{ isRefreshing ? `Refresh Data From Server (${refreshCountdown})` : 'Refresh Data From Server' }}
        </button>

      </div>

      <!-- Grid -->
      <Grid v-if="landId" />
    </main>

    <footer class="site-footer">
      <p>
        &copy; 2025 - Tool for Community -
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
import { ref } from 'vue'
import { useLandData } from './composables/useLandData'
import Grid from './components/Grid.vue'

const {
  landId,
  errorMessage,
  isRefreshing,
  refreshCountdown,
  submitLandId,
  clearLandId,
  refreshData,
} = useLandData()

const inputLandId = ref('')
</script>