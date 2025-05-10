<!-- src/views/LandDetails.vue -->
<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-4">Land Details</h1>

    <!-- No ID → prompt -->
    <div v-if="!landId" class="card bg-base-200 p-6 text-center">
      <p class="mb-4">Please choose a Land ID first.</p>
      <button class="btn btn-primary" @click="openDrawer">
        Choose Land
      </button>
    </div>

    <!-- ID but no data → show message -->
    <div v-else-if="!hasData" class="card bg-yellow-100 p-6 text-center">
      <p>No data found for Land ID “{{ landId }}”.</p>
      <button class="btn btn-sm" @click="retryLoad">Reload</button>
    </div>

    <!-- We have data → show the tree -->
    <div v-else class="card bg-base-200 p-4 shadow-sm">
      <JsonTree :data="state" :maxCollapsedDepth="2" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import JsonTree from '@/components/JsonTree.vue'
import { openMainDrawer as openDrawer } from '@/utils/drawerToggle'

const route = useRoute()
const landId = ref(route.params.landId || '')

// reactive state and a flag if we got data
const state = ref(null)
const hasData = ref(false)

function loadState() {
  if (!landId.value) {
    state.value = null
    hasData.value = false
    return
  }
  try {
    const raw = localStorage.getItem(`landData_${landId.value}`)
    if (raw) {
      state.value = JSON.parse(raw)
      hasData.value = true
    } else {
      state.value = null
      hasData.value = false
    }
  } catch (e) {
    console.error('Failed to parse landState:', e)
    state.value = null
    hasData.value = false
  }
}

// Watch for param changes
watch(() => route.params.landId, val => {
  landId.value = val || ''
  loadState()
})

onMounted(loadState)

// If user wants to retry
function retryLoad() {
  loadState()
}
</script>
