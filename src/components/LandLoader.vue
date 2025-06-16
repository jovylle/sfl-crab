<!-- src/components/LandLoader.vue -->
<template>
  <div class="flex flex-row space-x-4 items-center">
    <input
      v-model="inputLandId"
      placeholder="Enter Land ID"
      class="input input-bordered"
    />

    <button 
      class="btn btn-primary dark:text-black"
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
import { useLandSync } from '@/composables/useLandSync'



const route  = useRoute()
const router = useRouter()

const inputLandId = ref('')


function goToLand() {
  const id = inputLandId.value.trim()
  if (!id) return

  const hasCached = localStorage.getItem(`landData_${id}`)
  
  if (route.name === 'GuestDigging') {
    router.push({ name: 'Digging', params: { landId: id } })
  } else {
    router.push({ name: 'LandDetailsWithId', params: { landId: id } })
  }

  // Trigger full reload if first time
  if (!hasCached) {
  console.log("first")
    setTimeout(() => {
      const { reloadFromServer } = useLandSync({ landId: id })
      reloadFromServer({ landId: id })
    }, 300)
  }else{
    console.log("not first")
  }
}
</script>

<style scoped>
/* Optional extra styling */
</style>
