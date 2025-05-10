<!-- src/components/LandLoader.vue -->
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
      View Land Details
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const inputLandId = ref('')
const router      = useRouter()

function goToLand() {
  const id = inputLandId.value.trim()
  if (!id) return

  // Navigate to /:landId/details
  router.push({ name: 'LandDetailsWithId', params: { landId: id } })
}
</script>

<style scoped>
/* Optional extra styling */
</style>
