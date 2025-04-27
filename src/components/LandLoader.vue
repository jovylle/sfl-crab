<template>
  <div class="flex flex-row space-x-4 items-center">
    <input
      v-model="inputLandId"
      placeholder="Enter Land ID"
      class="input input-bordered"
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
