<template>
  <div class="flex flex-col gap-1.5">
  <p v-if="digDaySyncLabel" class="text-center text-[0.65rem] text-base-content/60 m-0 px-1">
    {{ digDaySyncLabel }}
    <router-link
      v-if="digDaySyncStatus === 'auth_required'"
      to="/login"
      class="link link-primary ml-1"
    >
      Sign in
    </router-link>
  </p>
  <p
    v-if="signedInLabel"
    class="text-center text-[0.65rem] text-base-content/50 m-0 px-1"
  >
    {{ signedInLabel }}
  </p>
  <p v-if="hubReplayUrl" class="text-center text-[0.65rem] m-0 px-1">
    <a
      :href="hubReplayUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="link link-secondary"
    >
      Open hub replay
    </a>
  </p>
  <div class="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
    <InputLandIdOrRefresh />
    <button
      type="button"
      class="btn text-base-100 btn-info btn-sm sm:btn-md"
      @click="goToPractice"
      title="Go to Practice"
    >
      Practice
    </button>
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn m-1 btn-accent btn-sm sm:btn-md">
        More ⋮
      </div>
      <div
        tabindex="0"
        class="dropdown-content card card-sm bg-base-100 z-1 shadow-lg"
      >
        <div class="card-body">
          <div class="space-y-2 text-left">
            <button
              class="btn btn-warning tooltip btn-sm text-nowrap"
              data-tip="🧹 Clear all custom marks"
              @click="grid.clear()"
            >
              🧹 Clear Marks
            </button>



            <!-- Controlled checkbox -->
            <button
              type="button"
              class="btn btn-primary btn-sm w-full tooltip"
              data-tip="Play today's digs and marks in a modal"
              :disabled="!canReplay"
              @click="$emit('open-replay')"
            >
              Replay
            </button>

            <button
              v-if="route.params.landId"
              type="button"
              class="btn btn-secondary btn-sm w-full tooltip"
              data-tip="Copy a link to this land’s dig page with your custom marks (same daily desert in-game)"
              @click="copyMarksLink($event)"
            >
              {{ marksLinkCopied ? 'Dig link copied' : 'Copy link with marks' }}
            </button>

            <label class="flex items-center mx-auto rounded border border-base-300 p-2 tooltip cursor-pointer" data-tip="Show Treasure Order">
              <input
                type="checkbox"
                :checked="showTreasureOrder"
                @change="$emit('update:showTreasureOrder', $event.target.checked)"
                class="checkbox checkbox-sm mr-1 text-nowrap "
              />
              Show Order
            </label>

            <label
              v-if="route.params.landId"
              class="flex items-center mx-auto rounded border border-base-300 p-2 tooltip cursor-pointer"
              data-tip="Hide numeric land ID from URL display"
            >
              <input
                type="checkbox"
                :checked="hideLandIdInUrl"
                @change="$emit('update:hideLandIdInUrl', $event.target.checked)"
                class="checkbox checkbox-sm mr-1 text-nowrap"
              />
              Don't show land id
            </label>

            <button
              type="button"
              class="btn btn-error btn-sm tooltip"
              data-tip="Clear Land ID"
              @click="clearLandId"
            >
              Clear Land ID
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>

</template>

<script setup>
import { computed, ref } from 'vue'
import { buildGuideMarksUrl } from '@/utils/shareLinks.js'
import { copyToClipboard } from '@/utils/gridStateCodec.js'
import { useGridManager } from '@/composables/useGridManager'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'
import { useHubSession } from '@/composables/useHubSession.js'

const route  = useRoute()
const router = useRouter()
const { isTestServer } = useApiEnvironment()
const { isAuthenticated, accountLabel } = useHubSession()
const landId = route.params.landId || '0'
const grid = useGridManager(landId)

// Public dig-day snapshots: data is keyed by landId + UTC date (no ownership in v1).
const props = defineProps({
  showTreasureOrder: { type: Boolean, default: false },
  hideLandIdInUrl: { type: Boolean, default: false },
  digDaySyncStatus: { type: String, default: 'idle' },
  digDayUpdatedAt: { type: String, default: null },
  digDaySyncError: { type: String, default: null },
  hubReplayUrl: { type: String, default: null },
  canReplay: { type: Boolean, default: false },
})

const signedInLabel = computed(() => {
  if (!route.params.landId || !isAuthenticated.value) return ''
  return `Signed in as ${accountLabel.value}`
})

const marksLinkCopied = ref(false)
let marksLinkCopiedTimer = null

async function copyMarksLink (event) {
  let recipientId = route.params.landId
  if (!recipientId) return

  // Shift+click: share same marks to a different land ID (optional).
  if (event?.shiftKey) {
    const entered = window.prompt(
      "Their land ID (URL will be /theirId/digging?marks=…):",
      String(recipientId)
    )
    if (!entered || !/^\d+$/.test(String(entered).trim())) return
    recipientId = String(entered).trim()
  }

  const url = buildGuideMarksUrl(recipientId, grid)
  if (!url) {
    window.alert(
      'Place marks on the grid first (click cells), then copy the dig link with your marks.'
    )
    return
  }
  const ok = await copyToClipboard(url)
  if (!ok) return
  marksLinkCopied.value = true
  if (marksLinkCopiedTimer) clearTimeout(marksLinkCopiedTimer)
  marksLinkCopiedTimer = setTimeout(() => {
    marksLinkCopied.value = false
  }, 2000)
}

const digDaySyncLabel = computed(() => {
  if (!route.params.landId) return ''
  switch (props.digDaySyncStatus) {
    case 'loading':
      return 'Loading saved dig day…'
    case 'syncing':
      return 'Saving dig day…'
    case 'saved':
      return props.digDayUpdatedAt
        ? `Dig day saved · ${formatShortTime(props.digDayUpdatedAt)}`
        : 'Dig day saved'
    case 'auth_required':
      return props.digDaySyncError || 'Sign in to save dig day to your account.'
    case 'error':
      return (
        props.digDaySyncError ||
        'Dig day sync failed (will retry on next change)'
      )
    default:
      return ''
  }
})

function formatShortTime (iso) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
// we'll emit update:showTreasureOrder via @change above
defineEmits(['update:showTreasureOrder', 'update:hideLandIdInUrl', 'open-replay'])

function clearLandId () {
  const test = isTestServer.value
  const onDigging =
    route.name === 'Digging'
  router.push(
    resolveLandRoute(onDigging ? 'guestDigging' : 'detailsNoId', { test }),
  )
}

function goToPractice () {
  const test = isTestServer.value
  const id = route.params.landId
  router.push(
    resolveLandRoute(id ? 'practice' : 'practiceNoId', { landId: id, test }),
  )
}

</script>
