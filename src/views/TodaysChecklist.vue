<!-- src/views/TodaysChecklist.vue -->
<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-center gap-4">
      <h1 class="text-2xl font-bold  inline-block my-auto ">
        Today’s Checklist to Focus
      </h1>
      <HandySpot />
    </div>

    <!-- No landId: reuse card + Choose Land button -->
    <div v-if="!landId" class="card bg-base-200 p-6 text-center">
      <p>Please choose a Land ID first.</p>
      <button class="btn btn-primary mt-4" @click="openDrawer">
        Choose Land
      </button>
    </div>

    <div v-else class="space-x-4 space-y-4">
      <!-- Main Gift Checklist card -->
      <div class="card card-dash bg-emerald-100 max-w-sm shadow-sm inline-block">
        <div class="card-body space-y-4">
          <!-- NPC Multi-Select Dropdown & Refresh -->
          <div class="flex items-center space-x-4">
            <div class="dropdown">
              <div class="flex gap-4">
                <h2 class="card-title my-auto">Gift/Flower Checklist</h2>
                <label tabindex="0" class="btn btn-outline">Select NPCs</label>
              </div>
              <ul
                tabindex="0"
                class="dropdown-content menu p-4 shadow bg-base-100 rounded-box w-96 grid grid-cols-2 gap-2"
              >
                <li v-for="npc in npcList" :key="npc.id">
                  <label class="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      class="checkbox"
                      :value="npc.id"
                      v-model="selectedNpcIds"
                    />
                    <span>{{ npc.displayName }}</span>
                  </label>
                </li>
              </ul>
            </div>
          </div>

          <!-- Zebra table of selected NPC statuses -->
          <div v-if="selectedNpcs.length">
            <table class="table w-full zebra">
              <thead>
                <tr>
                  <th>NPC</th>
                  <th class="text-center">Gifted Today</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="npc in selectedNpcs" :key="npc.id">
                  <td>{{ npc.displayName }}</td>
                  <td class="text-center">
                    <span v-if="isGiftedToday(npc)">✔️</span>
                    <span v-else>❌</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-gray-500">No NPCs selected.</div>
        </div>
      </div>

      <div class="card card-dash bg-emerald-100 max-w-sm inline-block shadow-sm">
        <div class="card-body">
          <h2 class="card-title">More to be added</h2>
          <p>
            A card component has a figure, a body part, and inside body there
            are title and actions parts
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { openMainDrawer as openDrawer } from '@/utils/drawerToggle'
import HandySpot from '../components/HandySpot.vue'

// --- Keys & Route ---
const route = useRoute()
const LAND_ID_KEY     = 'todays-checklist:landId'
const NPCS_SELECT_KEY = 'todays-checklist:selectedNpcIds'

// --- Raw land data loader ---
const landRaw = ref({ visitedFarmState: { npcs: {} } })
function loadFromStorage(id) {
  if (!id) {
    landRaw.value = { visitedFarmState: { npcs: {} } }
    return
  }
  const raw = localStorage.getItem(`landData_${id}`)
  landRaw.value = raw ? JSON.parse(raw) : { visitedFarmState: { npcs: {} } }
}
// --- landId logic (URL param wins) ---
const landId = ref(
  route.params.landId ??
  localStorage.getItem(LAND_ID_KEY) ??
  ''
)

watch(
  () => route.params.landId,
  v => { if (v) landId.value = v }
)

onMounted(() => {
  console.log('Today’s Checklist component mounted.')
  // Example: re-fetch or validate data
  if (!landId.value) {
    console.info('No landId set on mount.')
  }else{
    console.info('Yes land ID.')
    // loadFromStorage(landId.value)
  }
})

watch(
  landId,
  id => {
    if (!route.params.landId) {
      if (id) localStorage.setItem(LAND_ID_KEY, id)
      else localStorage.removeItem(LAND_ID_KEY)
    }
    loadFromStorage(id)
  },
  { immediate: true }
)

// --- Build NPC list ---
const npcList = computed(() => {
  const npcs = landRaw.value.visitedFarmState.npcs || {}
  return Object.entries(npcs).map(([id, npc]) => ({
    id,
    displayName: npc.name || id,
    friendship: npc.friendship || {}
  }))
})

// --- Selected NPC IDs (multi-select) ---
const selectedNpcIds = ref(
  JSON.parse(localStorage.getItem(NPCS_SELECT_KEY) || '[]')
)

watch(
  selectedNpcIds,
  ids => {
    localStorage.setItem(NPCS_SELECT_KEY, JSON.stringify(ids))
  },
  { deep: true }
)

// --- Compute selected NPC objects ---
const selectedNpcs = computed(() =>
  npcList.value.filter(npc => selectedNpcIds.value.includes(npc.id))
)

// --- Gifted-today helper ---
function isGiftedToday(npc) {
  const ts = npc.friendship.giftedAt
  if (!ts) return false
  const now = new Date()
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return ts >= midnight
}
</script>

<style scoped>
/* No extra drawer styling needed—MainDrawer handles its own */
</style>
