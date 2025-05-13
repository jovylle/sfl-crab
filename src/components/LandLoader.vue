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
      Use Land ID
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'


const route  = useRoute()
const router = useRouter()

const inputLandId = ref('')

function goToLand() {
  const id = inputLandId.value.trim()
  if (!id) return

  
  if (route.name === 'GuestDigging') {
    router.push({ name: 'Digging', params: { landId: id } })
  } else {
    router.push({ name: 'LandDetailsWithId', params: { landId: id } })
  }
}


</script>

<style scoped>
/* Optional extra styling */
</style>
