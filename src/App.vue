<!-- filepath: /Users/jovylle.bermudez/fore/lab/sfl-crab/src/App.vue -->
<template>
  <div class="container">
    <header class="site-header">
      <h1>SFL Digging Assistant V2</h1>
    </header>

    <main class="site-main">
      <!-- Land ID Input -->
      <div v-if="!landId" class="" style="margin-bottom: 12px;">
        <input
          v-model="inputLandId"
          placeholder="Enter Land ID"
          @keyup.enter="redirectToLandId"
          class="land-id-input"
        />
        <button @click="redirectToLandId">Submit2</button>
        <span class="instructions">Enter a Land ID to load data</span>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>

      <!-- Buttons -->
      <div v-else style="margin: 0px -0.5rem 0px -0.5rem;">
        <button @click="clearLandId">Change Land ID</button>
        <button
          @click="refreshData"
          :disabled="isRefreshing"
        >
          {{ isRefreshing ? `Refresh Data From Server (${refreshCountdown})` : 'Refresh Data From Server' }}
        </button>

      </div>
      
      <!-- Grid -->
      <Grid />
      <InfoFooter />
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
import InfoFooter from './components/InfoFooter.vue'

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
import { onMounted } from 'vue'


onMounted(() => {
  const path = window.location.pathname.replace('/', '')

  if (path && !isNaN(path)) {
    localStorage.setItem('landId', path)
    landId.value = path
    console.log('LandID loaded from URL:', path)
  } else {
    console.log('No valid LandID in URL, waiting for manual input')
  }
})

const redirectToLandId = () => {
  if (inputLandId.value.trim()) {
    window.location.href = `/${inputLandId.value.trim()}`
  }
}
</script>