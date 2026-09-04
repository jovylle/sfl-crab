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
      <div class="tabs tabs-boxed w-fit">
        <button
          type="button"
          class="tab"
          :class="{ 'tab-active': adminTab === 'blobs' }"
          @click="adminTab = 'blobs'"
        >
          Blob stores (legacy)
        </button>
        <button
          type="button"
          class="tab"
          :class="{ 'tab-active': adminTab === 'feedback' }"
          @click="switchToFeedbackTab"
        >
          Public feedback
          <span v-if="moderationPendingCount" class="badge badge-primary badge-sm ml-1">{{ moderationPendingCount }}</span>
        </button>
      </div>

      <!-- Legacy Netlify Blobs browser -->
      <div v-if="adminTab === 'blobs'" class="grid gap-4 lg:grid-cols-[220px_1fr]">
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
                <img
                  v-if="blobScreenshotSrc"
                  :src="blobScreenshotSrc"
                  class="max-h-64 rounded border border-base-300 mb-2"
                  alt="Feedback screenshot"
                />
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

      <!-- Cloudflare ProjectMate moderation queue -->
      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm opacity-70">
            Only items where the user ticked “allow public display” can go public.
            Approve = shows on <router-link to="/feedbacks" class="link">/feedbacks</router-link>.
            Same admin password is used as Worker Bearer — set Worker <code>ADMIN_API_KEY</code> to the same value to lock it down.
          </p>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            :disabled="loadingMod"
            @click="refreshModeration"
          >
            Refresh
          </button>
        </div>

        <p v-if="!issuesEndpoint" class="alert text-sm">
          Missing <code>VITE_PROJECTMATE_ISSUES_ENDPOINT</code> — set it to
          <code>https://projectmate-issues-api.jovyllebermudez.workers.dev</code> and redeploy.
        </p>
        <p v-if="modError" class="text-error text-sm">{{ modError }}</p>

        <div v-if="loadingMod" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg" />
        </div>

        <div v-else-if="moderation.length" class="grid gap-3">
          <article
            v-for="item in moderation"
            :key="item.id"
            class="card bg-base-200 shadow-sm"
          >
            <div class="card-body p-4">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="badge" :class="statusBadge(item.status)">{{ item.status }}</span>
                <span
                  class="badge"
                  :class="item.meta?.allowPublicDisplay ? 'badge-success' : 'badge-ghost'"
                >
                  {{ item.meta?.allowPublicDisplay ? 'user allows public' : 'private only' }}
                </span>
                <span class="opacity-60">{{ formatDate(item.createdAt) }}</span>
                <span v-if="item.meta?.displayName" class="font-semibold">— {{ item.meta.displayName }}</span>
              </div>
              <p class="text-sm mt-2 whitespace-pre-wrap break-words">{{ item.message }}</p>
              <div class="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  class="btn btn-xs btn-success"
                  :disabled="updatingId === item.id || !item.meta?.allowPublicDisplay"
                  :title="item.meta?.allowPublicDisplay ? 'Publish to /feedbacks' : 'User did not consent — cannot publish'"
                  @click="moderate(item, 'approved_open')"
                >
                  {{ updatingId === item.id ? '…' : 'Publish' }}
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-outline"
                  :disabled="updatingId === item.id"
                  @click="moderate(item, 'resolved')"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-error btn-outline"
                  :disabled="updatingId === item.id"
                  @click="moderate(item, 'rejected')"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        </div>

        <p v-else-if="issuesEndpoint" class="text-sm opacity-60 py-6 text-center">
          Queue empty — new feedback with “allow public display” will appear here.
        </p>
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
import {
  getIssuesEndpoint,
  listModeration,
  setIssueStatus,
} from '@/services/projectmateService.js'

const password = ref(getStoredAdminPassword())
const passwordInput = ref('')
const authenticated = ref(Boolean(password.value))
const loggingIn = ref(false)
const loginError = ref('')

const adminTab = ref('feedback')
const stores = ref([])
const selectedStoreId = ref('practice-daily-patterns')
const prefixFilter = ref('')
const keys = ref([])
const selectedKey = ref('')
const blobPreview = ref('')
const blobScreenshotSrc = ref('')

const loadingKeys = ref(false)
const loadingBlob = ref(false)
const rebuilding = ref(false)
const deleting = ref(false)
const keysError = ref('')
const blobError = ref('')

// ProjectMate moderation
const issuesEndpoint = ref(getIssuesEndpoint())
const moderation = ref([])
const loadingMod = ref(false)
const modError = ref('')
const updatingId = ref('')

const selectedStore = computed(() =>
  stores.value.find(s => s.id === selectedStoreId.value),
)

const moderationPendingCount = computed(() =>
  moderation.value.filter(i => i.status === 'pending' || (i.status === 'approved_open' && i.meta?.allowPublicDisplay)).length,
)

function statusBadge (status) {
  if (status === 'approved_open') return 'badge-success'
  if (status === 'pending') return 'badge-warning'
  if (status === 'resolved') return 'badge-info'
  return 'badge-ghost'
}

function formatDate (iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso || ''
  }
}

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
    await refreshModeration()
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
  blobScreenshotSrc.value = ''
  moderation.value = []
}

async function bootstrapSession () {
  if (!password.value) return
  try {
    const result = await verifyAdminPassword(password.value)
    stores.value = result.stores || []
    authenticated.value = true
    await refreshKeys()
    await refreshModeration()
  } catch {
    logout()
  }
}

function selectStore (storeId) {
  selectedStoreId.value = storeId
  selectedKey.value = ''
  blobPreview.value = ''
  blobScreenshotSrc.value = ''
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
  blobScreenshotSrc.value = ''
  try {
    const result = await getAdminBlob(password.value, selectedStoreId.value, key)
    if (selectedStoreId.value === 'feedback-reports' && result.data?.screenshot) {
      blobScreenshotSrc.value = result.data.screenshot
      blobPreview.value = JSON.stringify(
        { ...result.data, screenshot: '[image omitted, see preview above]' },
        null,
        2,
      )
    } else {
      blobPreview.value = JSON.stringify(result.data, null, 2)
    }
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
    blobScreenshotSrc.value = ''
    await refreshKeys()
  } catch (err) {
    blobError.value = err.message
  } finally {
    deleting.value = false
  }
}

async function switchToFeedbackTab () {
  adminTab.value = 'feedback'
  await refreshModeration()
}

async function refreshModeration () {
  if (!issuesEndpoint.value) return
  modError.value = ''
  loadingMod.value = true
  try {
    moderation.value = await listModeration(password.value)
  } catch (err) {
    modError.value = err.message
    // If Worker has ADMIN_API_KEY set and password mismatches, it 403s — tell them plainly
    if (String(err.message).toLowerCase().includes('admin')) {
      modError.value += ' (Worker ADMIN_API_KEY mismatch? Set it to the same value as Netlify ADMIN_PASSWORD.)'
    }
    moderation.value = []
  } finally {
    loadingMod.value = false
  }
}

async function moderate (item, status) {
  if (status === 'approved_open' && !item.meta?.allowPublicDisplay) {
    window.alert('User did not consent to public display — cannot publish.')
    return
  }
  updatingId.value = item.id
  modError.value = ''
  try {
    const updated = await setIssueStatus(password.value, item.id, status)
    moderation.value = moderation.value.map(m => (m.id === updated.id ? updated : m))
  } catch (err) {
    modError.value = err.message
  } finally {
    updatingId.value = ''
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
