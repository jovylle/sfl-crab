<template>
  <div class="flex flex-col gap-1.5">
  <p v-if="digDaySyncLabel" class="text-center text-[0.65rem] text-base-content/60 m-0 px-1">
    {{ digDaySyncLabel }}
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
              data-tip="Copy a link for a friend: your hint marks on their land grid"
              @click="copyMarksLink"
            >
              {{ marksLinkCopied ? 'Marks link copied' : 'Share marks link' }}
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
import { buildMarksShareUrlForLand } from '@/utils/shareLinks.js'
import { copyToClipboard } from '@/utils/gridStateCodec.js'
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
  canReplay: { type: Boolean, default: false },
})

const marksLinkCopied = ref(false)
let marksLinkCopiedTimer = null

async function copyMarksLink () {
  const fromId = route.params.landId
  if (!fromId) return

  const toId = window.prompt(
    "Friend's land ID — they'll see your marks on their grid (same daily desert):",
    ''
  )
  if (!toId || !/^\d+$/.test(String(toId).trim())) return

  const url = buildMarksShareUrlForLand(fromId, String(toId).trim(), grid)
  if (!url) return
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
