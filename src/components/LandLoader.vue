<template>
  <div class="flex flex-row space-x-4 items-center">
    <input
      v-model="inputLandId"
      :placeholder="landIdPlaceholder"
      class="input input-bordered"
      @input="filterInput"
    />

    <button 
      class="btn btn-primary dark:text-black"
      @click="goToLand"
      :disabled="!isValidLandId"
    >
      Use Land ID
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLandSync } from '@/composables/useLandSync'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'
import { readLandCacheMeta } from '@/utils/landCache.js'
import { resolveLandRoute } from '@/utils/landRoutes.js'

const route  = useRoute()
const router = useRouter()

const { isTestServer, testExampleLandId } = useApiEnvironment()

const landIdPlaceholder = computed(() =>
  isTestServer.value
    ? `e.g. ${testExampleLandId}`
    : 'Enter Land ID',
)

const inputLandId = ref('')

function filterInput(e) {
  console.log("filterInput", e.target.value)
  let value = e.target.value.replace(/\D/g, '') // remove non-digits
  if (value.length > 50) value = value.slice(0, 50)
  console.log("Filtered value:", value)
  inputLandId.value = value
}

const isValidLandId = computed(() => inputLandId.value.trim().length > 0)

function goToLand() {
  const id = inputLandId.value.trim()
  if (!id) return

  const { shouldAutoFetch } = readLandCacheMeta(id)

  const test = isTestServer.value
  if (route.name === 'GuestDigging' || route.name === 'TestGuestDigging') {
    router.push(resolveLandRoute('digging', { landId: id, test }))
  } else {
    router.push(resolveLandRoute('details', { landId: id, test }))
  }

  if (shouldAutoFetch) {
    setTimeout(() => {
      const { reloadFromServer } = useLandSync({ landId: id })
      reloadFromServer({ landId: id })
    }, 300)
  }
}
</script>
