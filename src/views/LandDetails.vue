<!-- src/views/LandDetails.vue -->
<template>
  <div class="p-6 space-y-6">
    <h1 class="text-3xl font-bold">Land Raw Details</h1>

    <!-- Dropdown with checkboxes -->
    <div class="dropdown">
      <label tabindex="0" class="btn btn-secondary m-1">
        Fields ({{ selectedKeys.length }})
      </label>
      <ul
        class="dropdown-content menu p-2 shadow bg-base-100 rounded-box
               min-w-[310px] max-w-[520px] max-h-[600px] overflow-auto
               grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(147px,1fr))] overflow-x-hidden"
      >
        <li v-for="key in stateKeys" :key="key">
          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :value="key"
              v-model="selectedKeys"
            />
            <span class="break-words whitespace-normal">{{ key }}</span>
          </label>
        </li>
        <li class="col-span-full divider"></li>
        <li class="col-span-full">
          <button class="btn btn-sm w-full" @click="selectAll">
            Select All
          </button>
        </li>
        <li class="col-span-full">
          <button class="btn btn-sm w-full" @click="clearAll">Clear All</button>
        </li>
      </ul>
    </div>

    <!-- No ID chosen -->
    <div v-if="!landId" class="card bg-base-200 p-6 text-center">
      <p>Please choose a Land ID first.</p>
      <button class="btn btn-primary mt-4" @click="openDrawer">
        Choose Land
      </button>
    </div>

    <!-- ID but no data -->
    <div v-else-if="!hasData" class="card bg-yellow-100 p-6 text-center">
      <p>No data found for Land ID “{{ landId }}”.</p>
      <button class="btn btn-sm mt-4" @click="loadState">Retry</button>
    </div>

    <!-- Render selected sections -->
    <div v-else class="space-y-8">
      <div
        v-for="key in selectedKeys"
        :key="key"
        class="card bg-base-200 p-4 shadow-sm overflow-auto"
      >
        <h3 class="text-2xl font-semibold mb-2 bg-base-100">{{ key }}</h3>
        <KeyValueList :data="fieldValue(key)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import KeyValueList from '@/components/KeyValueList.vue'
import { openMainDrawer as openDrawer } from '@/utils/drawerToggle'

const route        = useRoute()
const landId       = ref(route.params.landId || '')
const rawData      = ref(null)
const hasData      = ref(false)
// start with these two selected by default
const selectedKeys = ref(['inventory', 'coins'])

// Load from localStorage under key `landData_<id>`
function loadState() {
  if (!landId.value) {
    rawData.value = null
    hasData.value  = false
    return
  }
  const raw = localStorage.getItem(`landData_${landId.value}`)
  if (!raw) {
    rawData.value = null
    hasData.value  = false
    return
  }
  try {
    rawData.value = JSON.parse(raw)
    hasData.value  = Boolean(rawData.value?.state)
  } catch {
    rawData.value = null
    hasData.value  = false
  }
}

// Watch for route changes (new landId)
watch(
  () => route.params.landId,
  (id) => {
    landId.value = id || ''
    loadState()
    // reset selection to defaults
    selectedKeys.value = ['inventory', 'coins']
  }
)

onMounted(loadState)

// All top-level keys under `state`
const stateKeys = computed(() =>
  rawData.value?.state ? Object.keys(rawData.value.state) : []
)

// Grab a specific field’s value; wrap primitives in an object
function fieldValue(key) {
  const v = rawData.value?.state?.[key]
  return typeof v === 'object' && v !== null ? v : { [key]: v }
}

// Checkbox helpers
function selectAll() {
  selectedKeys.value = [...stateKeys.value]
}
function clearAll() {
  selectedKeys.value = []
}
</script>
