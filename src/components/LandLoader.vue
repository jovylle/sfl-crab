<template>
  <div class="flex flex-col items-center mt-8">
    <input
      v-model="inputLandId"
      placeholder="Enter Land ID"
      class="input input-bordered mb-4"
    />

    <button 
      class="btn btn-primary"
      @click="goToLand"
      :disabled="!inputLandId.trim()"
    >
      Change Land ID
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const inputLandId = ref('')

function goToLand() {
  if (inputLandId.value.trim()) {
    window.location.href = `/${inputLandId.value.trim()}`
  }
}
</script>

<style scoped>
/* Optional extra styling */
</style>
