<template>
  <div class="flex flex-col gap-1 mb-1">
  <p v-if="digDaySyncLabel" class="text-center text-[0.65rem] text-base-content/60 m-0">
    {{ digDaySyncLabel }}
  </p>
  <div class="flex gap-4 justify-center items-center">
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
              data-tip="Step through today's digs and marks"
              :disabled="!canReplay"
              @click="$emit('open-replay')"
            >
              Replay
            </button>

            <button
              v-if="hubReplayUrl"
              type="button"
              class="btn btn-secondary btn-sm w-full tooltip"
              data-tip="Open today's dig replay on SFL Digging Hub"
              @click="openHubReplay"
            >
              Open in Hub ↗
            </button>

            <button
              v-if="hubReplayUrl"
              type="button"
              class="btn btn-ghost btn-sm w-full tooltip"
              data-tip="Copy hub replay link"
              @click="copyHubReplayLink"
            >
              {{ hubLinkCopied ? 'Link copied' : 'Copy hub link' }}
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
import { useGridManager } from '@/composables/useGridManager'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()
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

const hubLinkCopied = ref(false)
let hubLinkCopiedTimer = null

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
    case 'error':
      return (
        props.digDaySyncError ||
        'Dig day sync failed (will retry on next change)'
      )
    default:
      return ''
  }
})

function openHubReplay () {
  if (!props.hubReplayUrl) return
  window.open(props.hubReplayUrl, '_blank', 'noopener,noreferrer')
}

async function copyHubReplayLink () {
  if (!props.hubReplayUrl) return
  try {
    await navigator.clipboard.writeText(props.hubReplayUrl)
    hubLinkCopied.value = true
    if (hubLinkCopiedTimer) clearTimeout(hubLinkCopiedTimer)
    hubLinkCopiedTimer = setTimeout(() => {
      hubLinkCopied.value = false
    }, 2000)
  } catch {
    openHubReplay()
  }
}

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
  if (route.name === 'Digging') {
    // we're on /:landId/digging → go to /digging
    router.push({ name: 'GuestDigging' })
  } else {
    // default to details no-id
    router.push({ name: 'LandDetailsNoId' })
  }
}

function goToPractice () {
  if (route.params.landId) {
    router.push({ name: 'PracticeWithId', params: { landId: route.params.landId } })
  } else {
    router.push({ name: 'Practice' })
  }
}

</script>
