<template>
  <div class="flex flex-col items-center space-x-4">
    <div class="flex items-center space-x-4">
      <button
        class="btn btn-outline btn-sm btn-error "
        @click="clearLandId"
      >
        ❌ Clear Land ID
      </button>
      <button 
        class="btn btn-success"
        :disabled="!landId || loading.value || !canRefresh"
        @click="refresh"
      >
        <span v-if="loading.value">Refreshing…</span>
        <span v-else>🔄 Update Local Data</span>
      </button>
    </div>
    <!-- <pre>
      Land ID: {{ landId }}
      loading: {{ loading.value }}
      canRefresh: {{ canRefresh }}
    </pre> -->
    <div v-if="lastRefreshed" class="text-xs text-gray-500 mt-2">
      Local Data Last Update: {{ formattedLastRefreshed }}
    </div>

    <div v-if="error.value" class="text-red-500 mt-2 text-sm">
      {{ error.value }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getLandIdFromUrl } from '@/utils/getLandId'
import { useLandService } from '@/composables/useLandService'
import { gridStore } from '@/composables/gridStore'

const landId = getLandIdFromUrl()
const { loading, error, loadLandData } = useLandService()
const { updateGridFromData } = gridStore

// Track when we last refreshed
const lastRefreshed = ref(0)

// Cooldown: only allow once every 10 seconds
const canRefresh = computed(() => {
  const last = Number(localStorage.getItem('lastLandRefresh') || 0)
  return Date.now() - last > 10000
})

const formattedLastRefreshed = computed(() =>
  lastRefreshed.value
    ? new Date(lastRefreshed.value).toLocaleTimeString()
    : ''
)

function clearLandId() {
  // resets URL to “no land” state
  window.location.href = '/'
}
function refresh() {
  if (!landId) return

  loadLandData(landId).then(json => {
    const now = Date.now()
    lastRefreshed.value = now
    localStorage.setItem('lastLandRefresh', now)

    if (json?.state?.desert?.digging?.grid) {
      updateGridFromData(json.state.desert.digging.grid)
    }
  })
}

onMounted(() => {
  // restore any previous timestamp
  lastRefreshed.value = Number(localStorage.getItem('lastLandRefresh') || 0)
})
</script>

<style scoped>
/* optional tweaks */
</style>
