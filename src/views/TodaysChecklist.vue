<!-- src/views/TodaysChecklist.vue -->
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Today’s Checklist</h1>

    <!-- No landId: reuse card + Choose Land button -->
    <div v-if="!landId" class="card bg-base-200 p-6 text-center">
      <p>Please choose a Land ID first.</p>
      <button class="btn btn-primary mt-4" @click="openDrawer">
        Choose Land
      </button>
    </div>

    <!-- Main Gift Checklist card -->
    <div v-else class="card bg-base-100 shadow">
      <div class="card-body space-y-4">
        <h2 class="card-title">Gift Checklist</h2>

        <!-- NPC Multi-Select Dropdown & Refresh -->
        <div class="flex items-center space-x-4">
          <div class="dropdown">
            <label tabindex="0" class="btn btn-outline">Select NPCs</label>
            <ul
              tabindex="0"
              class="dropdown-content menu p-4 shadow bg-base-100 rounded-box w-64 grid grid-cols-2 gap-2"
            >
              <li
                v-for="npc in npcList"
                :key="npc.id"
              >
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

          <button class="btn btn-secondary" @click="refresh">
            Refresh
          </button>
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
                  <input
                    type="checkbox"
                    class="checkbox"
                    :checked="isGiftedToday(npc)"
                    disabled
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-gray-500">
          No NPCs selected.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { openMainDrawer as openDrawer } from '@/utils/drawerToggle'

// --- Keys & Route ---
const route = useRoute()
const LAND_ID_KEY     = 'todays-checklist:landId'
const NPCS_SELECT_KEY = 'todays-checklist:selectedNpcIds'

// --- Raw land data loader ---
const landRaw = ref({ state: { npcs: {} } })
function loadFromStorage(id) {
  if (!id) {
    landRaw.value = { state: { npcs: {} } }
    return
  }
  const raw = localStorage.getItem(`landData_${id}`)
  landRaw.value = raw ? JSON.parse(raw) : { state: { npcs: {} } }
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
  const npcs = landRaw.value.state.npcs || {}
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

// --- Refresh handler ---
function refresh() {
  if (landId.value) loadFromStorage(landId.value)
}
</script>

<style scoped>
/* No extra drawer styling needed—MainDrawer handles its own */
</style>
