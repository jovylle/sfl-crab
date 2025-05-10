<template>
  <div class="p-6 space-y-6">
    <h1 class="text-3xl font-bold">Land Details</h1>

    <!-- Key multi-selector -->
    <div class="form-control w-80">
      <label class="label">
        <span class="label-text">Select fields to view</span>
      </label>
      <select
        v-model="selectedKeys"
        multiple
        class="select select-bordered h-32"
      >
        <option
          v-for="key in stateKeys"
          :key="key"
          :value="key"
        >
          {{ key }}
        </option>
      </select>
      <p class="text-sm text-gray-500 mt-1">
        (Hold Ctrl ⌃ / Cmd ⌘ to select multiple)
      </p>
    </div>

    <!-- No data / no ID -->
    <div v-if="!landId" class="card bg-base-200 p-6 text-center">
      <p>Please choose a Land ID first.</p>
      <button class="btn btn-primary mt-4" @click="openDrawer">
        Choose Land
      </button>
    </div>
    <div v-else-if="!hasData" class="card bg-yellow-100 p-6 text-center">
      <p>No data found for Land ID “{{ landId }}”.</p>
      <button class="btn btn-sm mt-4" @click="loadState">Retry</button>
    </div>

    <!-- Render each selected field -->
    <div v-else class="space-y-8">
      <div
        v-for="key in selectedKeys"
        :key="key"
        class="card bg-base-200 p-4 shadow-sm overflow-auto"
      >
        <h2 class="text-xl font-semibold mb-2">{{ key }}</h2>

        <template v-if="isObject(fieldValue(key))">
          <JsonTree :data="fieldValue(key)" :maxCollapsedDepth="3" />
        </template>
        <template v-else>
          <p class="text-gray-800">{{ fieldValue(key) }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import JsonTree from '@/components/JsonTree.vue'
import { openMainDrawer as openDrawer } from '@/utils/drawerToggle'

const route   = useRoute()
const landId  = ref(route.params.landId || '')
const rawData = ref(null)   // holds full LS object: { state: { … } }
const hasData = ref(false)

// which keys under `state` to show
const selectedKeys = ref(['inventory', 'coins'])

// load from LS
function loadState() {
  if (!landId.value) {
    rawData.value = null
    hasData.value = false
    return
  }
  const raw = localStorage.getItem(`landData_${landId.value}`)
  if (!raw) {
    rawData.value = null
    hasData.value = false
    return
  }
  try {
    rawData.value = JSON.parse(raw)
    hasData.value = Boolean(rawData.value?.state)
    // ensure defaults only if first load
    if (
      selectedKeys.value.length === 0 &&
      hasData.value
    ) {
      // default picks
      selectedKeys.value = ['inventory', 'coins']
    }
  } catch {
    rawData.value = null
    hasData.value = false
  }
}

// watch for URL changes
watch(
  () => route.params.landId,
  (id) => {
    landId.value = id || ''
    loadState()
  }
)
onMounted(loadState)

// list of keys under `state`
const stateKeys = computed(() =>
  rawData.value?.state
    ? Object.keys(rawData.value.state)
    : []
)

// helper to grab a field’s value
function fieldValue(key) {
  return rawData.value?.state?.[key]
}

// object test
const isObject = (v) => v !== null && typeof v === 'object'
</script>
