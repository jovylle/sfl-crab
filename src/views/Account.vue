<template>
  <section class="w-full max-w-xl mx-auto space-y-4 text-left">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold">Account</h1>
        <p class="text-sm text-base-content/70">
          Manage saved Land IDs and jump back into digging quickly.
        </p>
      </div>
      <a
        :href="hubHomeUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary btn-sm"
      >
        Open Hub
      </a>
    </div>

    <div v-if="!isAuthenticated" class="card bg-base-200">
      <div class="card-body gap-3">
        <p class="text-sm text-base-content/80">
          You are currently a guest. Sign in to sync saved lands across devices.
        </p>
        <router-link :to="loginTo" class="btn btn-primary btn-sm w-fit">
          Approve login
        </router-link>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="card bg-base-200">
        <div class="card-body gap-2">
          <h2 class="card-title text-base">Signed in as</h2>
          <p class="text-sm font-semibold">{{ accountLabel }}</p>
          <p v-if="profileEmail" class="text-xs text-base-content/70">
            {{ profileEmail }}
          </p>
        </div>
      </div>

      <div class="card bg-base-200">
        <div class="card-body gap-3">
          <h2 class="card-title text-base">Saved Land IDs</h2>

          <form class="flex gap-2" @submit.prevent="onAddLand">
            <input
              v-model="newLandId"
              type="text"
              inputmode="numeric"
              placeholder="Enter Land ID"
              class="input input-bordered input-sm flex-1"
            />
            <button type="submit" class="btn btn-primary btn-sm" :disabled="saving">
              Add
            </button>
          </form>

          <p v-if="error" class="text-error text-sm">{{ error }}</p>
          <p v-else-if="notice" class="text-success text-sm">{{ notice }}</p>

          <p v-if="loading" class="text-sm text-base-content/70 inline-flex items-center gap-2">
            <span class="loading loading-spinner loading-xs"></span>
            Updating saved lands...
          </p>
          <p v-if="!loading && savedLands.length === 0" class="text-sm text-base-content/70">
            No saved Land IDs yet.
          </p>

          <ul v-if="savedLands.length > 0" class="space-y-2">
            <li
              v-for="land in savedLands"
              :key="land.landId"
              class="bg-base-100 rounded-box px-3 py-2 flex items-center justify-between gap-2"
            >
              <span class="font-medium">Land #{{ land.landId }}</span>
              <div class="flex items-center gap-2">
                <button class="btn btn-outline btn-sm" @click="goToDigging(land.landId)">
                  Go Digging
                </button>
                <button
                  class="btn btn-outline btn-error btn-sm"
                  :disabled="removingLandId === land.landId"
                  @click="onRemoveLand(land.landId)"
                >
                  Remove
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHubSession } from '@/composables/useHubSession.js'
import { isTestApiEnvironment } from '@/config/api.js'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import {
  fetchProfile,
  fetchSavedLands,
  removeLandId,
  saveLandId,
} from '@/services/hubProfileService.js'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, accountLabel } = useHubSession()

const loginTo = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

const hubHomeUrl = computed(() => (
  isTestApiEnvironment() ? 'https://beta.hub.d1g.uk' : 'https://hub.d1g.uk'
))

const loading = ref(false)
const saving = ref(false)
const removingLandId = ref('')
const error = ref('')
const notice = ref('')
const profileEmail = ref('')
const savedLands = ref([])
const newLandId = ref('')
const SAVED_LANDS_CACHE_KEY = 'sfl-hub-saved-lands-cache'

function readCachedSavedLands () {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(SAVED_LANDS_CACHE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => item && typeof item.landId === 'string')
  } catch {
    return []
  }
}

function writeCachedSavedLands (lands) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SAVED_LANDS_CACHE_KEY, JSON.stringify(lands))
}

async function loadAccountData () {
  if (!isAuthenticated.value) return
  savedLands.value = readCachedSavedLands()
  loading.value = true
  error.value = ''
  try {
    const [profile, lands] = await Promise.all([
      fetchProfile(),
      fetchSavedLands(),
    ])
    profileEmail.value = profile?.email || ''
    savedLands.value = Array.isArray(lands?.lands) ? lands.lands : []
    writeCachedSavedLands(savedLands.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load account data'
  } finally {
    loading.value = false
  }
}

function goToDigging (landId) {
  const test = isTestApiEnvironment()
  router.push(resolveLandRoute('digging', { landId, test }))
}

async function onAddLand () {
  const landId = newLandId.value.trim()
  if (!landId) {
    error.value = 'Land ID is required'
    notice.value = ''
    return
  }
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    await saveLandId(landId)
    newLandId.value = ''
    await loadAccountData()
    notice.value = `Saved Land ID ${landId}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not save Land ID'
  } finally {
    saving.value = false
  }
}

async function onRemoveLand (landId) {
  removingLandId.value = landId
  error.value = ''
  notice.value = ''
  try {
    await removeLandId(landId)
    savedLands.value = savedLands.value.filter(item => item.landId !== landId)
    writeCachedSavedLands(savedLands.value)
    notice.value = `Removed Land ID ${landId}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not remove Land ID'
  } finally {
    removingLandId.value = ''
  }
}

onMounted(() => {
  loadAccountData()
})
</script>
