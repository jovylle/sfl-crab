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

  const raw = JSON.parse(localStorage.getItem(`landData_${id}`) || '{}')
  const today = new Date().toISOString().slice(0, 10)
  const isStale = raw?.date !== today
  const isMissingState = !raw?.state

  if (route.name === 'GuestDigging') {
    router.push({ name: 'Digging', params: { landId: id } })
  } else {
    router.push({ name: 'LandDetailsWithId', params: { landId: id } })
  }

  if (isMissingState || isStale) {
    setTimeout(() => {
      const { reloadFromServer } = useLandSync({ landId: id })
      reloadFromServer({ landId: id })
    }, 300)
  }
}

</script>

<style scoped>
/* Optional extra styling */
</style>
