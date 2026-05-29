<template>
  <section class="text-left max-w-6xl mx-auto w-full space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold">Admin</h1>
      </div>
      <button
        v-if="authenticated"
        type="button"
        class="btn btn-ghost btn-sm"
        @click="logout"
      >
        Sign out
      </button>
    </div>

    <div v-if="!authenticated" class="card bg-base-200 shadow-md max-w-md">
      <div class="card-body">
        <h2 class="card-title text-lg">Sign in</h2>
        <label class="form-control w-full">
          <span class="label-text">Admin password</span>
          <input
            v-model="passwordInput"
            type="password"
            class="input input-bordered w-full"
            autocomplete="current-password"
            @keyup.enter="login"
          />
        </label>
        <p v-if="loginError" class="text-error text-sm">{{ loginError }}</p>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loggingIn || !passwordInput"
          @click="login"
        >
          <span v-if="loggingIn" class="loading loading-spinner loading-sm" />
          Enter admin
        </button>
      </div>
    </div>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside class="space-y-2">
          <p class="text-xs font-semibold uppercase opacity-60 px-2">Stores</p>
          <button
            v-for="store in stores"
            :key="store.id"
            type="button"
            class="btn btn-block justify-start btn-sm"
            :class="selectedStoreId === store.id ? 'btn-primary' : 'btn-ghost'"
            @click="selectStore(store.id)"
          >
            {{ store.label }}
          </button>
        </aside>

        <div class="space-y-4 min-w-0">
          <div v-if="selectedStore" class="flex flex-wrap gap-2 items-end">
            <label class="form-control flex-1 min-w-[12rem]">
              <span class="label-text text-xs">Key prefix filter</span>
              <input
                v-model="prefixFilter"
                type="text"
                class="input input-bordered input-sm w-full"
                :placeholder="selectedStore.keyHint"
              />
            </label>
            <button
              type="button"
              class="btn btn-sm btn-outline"
              :disabled="loadingKeys"
              @click="refreshKeys"
            >
              Refresh list
            </button>
          </div>

          <p v-if="keysError" class="text-error text-sm">{{ keysError }}</p>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="card bg-base-200 shadow-sm min-h-[16rem]">
              <div class="card-body p-4">
                <h3 class="font-semibold text-sm">
                  Keys
                  <span v-if="keys.length" class="opacity-60">({{ keys.length }})</span>
                </h3>
                <div v-if="loadingKeys" class="flex justify-center py-8">
                  <span class="loading loading-spinner" />
                </div>
                <ul v-else-if="keys.length" class="menu menu-sm p-0 max-h-96 overflow-y-auto">
                  <li v-for="item in keys" :key="item.key">
                    <button
                      type="button"
                      :class="{ 'active': selectedKey === item.key }"
                      @click="openKey(item.key)"
                    >
                      <span class="truncate font-mono text-xs">{{ item.key }}</span>
                    </button>
                  </li>
                </ul>
                <p v-else class="text-sm opacity-60 py-4">No blobs in this store (for this prefix).</p>
              </div>
            </div>

            <div class="card bg-base-200 shadow-sm min-h-[16rem]">
              <div class="card-body p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="font-semibold text-sm font-mono truncate">
                    {{ selectedKey || 'Select a key' }}
                  </h3>
                  <div v-if="selectedKey" class="flex gap-1">
                    <button
                      v-if="selectedStore?.canRebuild"
                      type="button"
                      class="btn btn-xs btn-outline"
                      :disabled="rebuilding"
                      @click="rebuildSelected"
                    >
                      Rebuild
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs btn-error btn-outline"
                      :disabled="deleting"
                      @click="confirmDelete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p v-if="blobError" class="text-error text-sm">{{ blobError }}</p>
                <div v-if="loadingBlob" class="flex justify-center py-8">
                  <span class="loading loading-spinner" />
                </div>
                <pre
                  v-else-if="blobPreview"
                  class="text-xs bg-base-300 rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words"
                >{{ blobPreview }}</pre>
                <p v-else class="text-sm opacity-60 py-4">Pick a key to view JSON.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  clearAdminSession,
  deleteAdminBlob,
  getAdminBlob,
  getStoredAdminPassword,
  listAdminBlobs,
  rebuildPracticeSnapshot,
  setStoredAdminPassword,
  verifyAdminPassword,
} from '@/services/adminBlobService.js'

const password = ref(getStoredAdminPassword())
const passwordInput = ref('')
const authenticated = ref(Boolean(password.value))
const loggingIn = ref(false)
const loginError = ref('')

const stores = ref([])
const selectedStoreId = ref('practice-daily-patterns')
const prefixFilter = ref('')
const keys = ref([])
const selectedKey = ref('')
const blobPreview = ref('')

const loadingKeys = ref(false)
const loadingBlob = ref(false)
const rebuilding = ref(false)
const deleting = ref(false)
const keysError = ref('')
const blobError = ref('')

const selectedStore = computed(() =>
  stores.value.find(s => s.id === selectedStoreId.value),
)

async function login () {
  loginError.value = ''
  loggingIn.value = true
  try {
    const result = await verifyAdminPassword(passwordInput.value)
    password.value = passwordInput.value
    setStoredAdminPassword(password.value)
    stores.value = result.stores || []
    authenticated.value = true
    passwordInput.value = ''
    await refreshKeys()
  } catch (err) {
    loginError.value =
      err.status === 503
        ? 'Admin is not available.'
        : err.status === 401
          ? 'Wrong password.'
          : 'Could not sign in.'
  } finally {
    loggingIn.value = false
  }
}

function logout () {
  clearAdminSession()
  password.value = ''
  authenticated.value = false
  stores.value = []
  keys.value = []
  selectedKey.value = ''
  blobPreview.value = ''
}

async function bootstrapSession () {
  if (!password.value) return
  try {
    const result = await verifyAdminPassword(password.value)
    stores.value = result.stores || []
    authenticated.value = true
    await refreshKeys()
  } catch {
    logout()
  }
}

function selectStore (storeId) {
  selectedStoreId.value = storeId
  selectedKey.value = ''
  blobPreview.value = ''
  blobError.value = ''
  refreshKeys()
}

async function refreshKeys () {
  if (!authenticated.value || !selectedStoreId.value) return
  keysError.value = ''
  loadingKeys.value = true
  try {
    const result = await listAdminBlobs(
      password.value,
      selectedStoreId.value,
      prefixFilter.value.trim(),
    )
    keys.value = result.keys || []
  } catch (err) {
    keysError.value = err.message
    keys.value = []
  } finally {
    loadingKeys.value = false
  }
}

async function openKey (key) {
  selectedKey.value = key
  blobError.value = ''
  loadingBlob.value = true
  blobPreview.value = ''
  try {
    const result = await getAdminBlob(password.value, selectedStoreId.value, key)
    blobPreview.value = JSON.stringify(result.data, null, 2)
  } catch (err) {
    blobError.value = err.message
  } finally {
    loadingBlob.value = false
  }
}

async function rebuildSelected () {
  if (!selectedKey.value?.endsWith('.json')) return
  const utcDate = selectedKey.value.replace(/\.json$/, '')
  rebuilding.value = true
  blobError.value = ''
  try {
    await rebuildPracticeSnapshot(password.value, utcDate, { force: true })
    await openKey(selectedKey.value)
    await refreshKeys()
  } catch (err) {
    blobError.value = err.message
  } finally {
    rebuilding.value = false
  }
}

async function confirmDelete () {
  if (!selectedKey.value) return
  if (!window.confirm(`Delete blob "${selectedKey.value}"? This cannot be undone.`)) return
  deleting.value = true
  blobError.value = ''
  try {
    await deleteAdminBlob(password.value, selectedStoreId.value, selectedKey.value)
    selectedKey.value = ''
    blobPreview.value = ''
    await refreshKeys()
  } catch (err) {
    blobError.value = err.message
  } finally {
    deleting.value = false
  }
}

let prefixDebounce
watch(prefixFilter, () => {
  clearTimeout(prefixDebounce)
  prefixDebounce = setTimeout(() => {
    if (authenticated.value) refreshKeys()
  }, 400)
})

onMounted(() => {
  bootstrapSession()
})
</script>
