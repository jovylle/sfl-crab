<template>
  <div class="flex flex-col items-center space-y-4">
    <div class="flex flex-col sm:flex-row items-center gap-4">
      <button
        class="btn btn-outline btn-sm btn-error"
        @click="clearLandId"
      >
        ❌ Clear Land ID
      </button>

      <button
        class="btn btn-success"
        :disabled="!landId || loading || !canRefresh"
        @click="refresh"
      >
        <span v-if="loading">Refreshing…</span>
        <span v-else-if="!canRefresh">
          ⏳ Ready in {{ timeLeft }}s
        </span>
        <span v-else>
          🔄 Update Local Data
        </span>
      </button>
    </div>

    <div v-if="lastRefreshed" class="text-xs text-gray-500">
      Local Data Last Update: {{ formattedLastRefreshed }}
    </div>
    <div v-if="error" class="text-red-500 mt-2 text-sm">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLandService } from '@/composables/useLandService'
import { inject } from 'vue'

const gridStore = inject('gridStore')
import { triggerSoftReload } from '@/composables/useSoftReload'  // ← import this

const route  = useRoute()
const router = useRouter()

const landId  = route.params.landId  
const { loading, error, loadLandData } = useLandService()

// —— Reactive timestamps ——

// load previous timestamp (ms)
const lastRefreshed = ref(
  Number(localStorage.getItem('lastLandRefresh') || 0)
)
// a ticking “now” so we can compute elapsed
const now = ref(Date.now())
let ticker = null

onMounted(() => {
  // update now every second
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(ticker)
})

// cooldown in milliseconds
const COOLDOWN = 15_000

// how many ms have passed since last
const elapsed = computed(() => now.value - lastRefreshed.value)

// whether we can refresh
const canRefresh = computed(() => elapsed.value >= COOLDOWN)

// seconds remaining until ready
const timeLeft = computed(() =>
  canRefresh.value ? 0 : Math.ceil((COOLDOWN - elapsed.value) / 1000)
)

// nicely formatted time
const formattedLastRefreshed = computed(() =>
  lastRefreshed.value
    ? new Date(lastRefreshed.value).toLocaleTimeString()
    : ''
)

// —— Actions ——

function clearLandId() {
  // go back to home
  router.push({ name: 'Digging' })
  triggerSoftReload()
}


function refresh() {
  if (!landId || loading.value) return
  loadLandData(landId).then(json => {
    const grid = json?.state?.desert?.digging?.grid
    if (grid) {
      console.log('🔄 RefreshData → updateGridFromData', grid)
      gridStore.updateGridFromData(grid)
    }
    
    const nowMs = Date.now()
    lastRefreshed.value = nowMs
    localStorage.setItem('lastLandRefresh', String(nowMs))
  })
}
</script>

<style scoped>
/* any tweaks you like */
</style>
