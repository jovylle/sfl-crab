<template>
  <div class="flex flex-col gap-1.5">
  <div class="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
    <InputLandIdOrRefresh />
    <label class="flex items-center rounded border border-base-300 p-2 tooltip cursor-pointer" data-tip="Auto-highlight guaranteed treasure locations from known patterns">
      <input
        type="checkbox"
        :checked="showPrediction"
        @change="$emit('update:showPrediction', $event.target.checked)"
        class="checkbox checkbox-sm mr-1 text-nowrap"
      />
      Guaranteed
    </label>
    <button
      type="button"
      class="btn btn-info btn-sm sm:btn-md"
      @click="goToPractice"
      title="Go to Practice"
    >
      Practice Today's Pattern
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
              type="button"
              class="btn btn-primary btn-sm w-full"
              :disabled="!canReplay"
              @click="$emit('open-replay')"
              title="Replay today's digs"
            >
              Replay
            </button>

            <button
              class="btn btn-warning tooltip btn-sm text-nowrap"
              data-tip="🧹 Clear all custom marks"
              @click="grid.clear()"
            >
              🧹 Clear Marks
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
import { ref } from 'vue'
import { buildGuideMarksUrl } from '@/utils/shareLinks.js'
import { copyToClipboard } from '@/utils/gridStateCodec.js'
import { useGridManager } from '@/composables/useGridManager'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'

const route  = useRoute()
const router = useRouter()
const { isTestServer } = useApiEnvironment()
const landId = route.params.landId || '0'
const grid = useGridManager(landId)

// Public dig-day snapshots: data is keyed by landId + UTC date (no ownership in v1).
defineProps({
  showTreasureOrder: { type: Boolean, default: false },
  hideLandIdInUrl: { type: Boolean, default: false },
  showPrediction: { type: Boolean, default: false },
  digDaySyncStatus: { type: String, default: 'idle' },
  digDayUpdatedAt: { type: String, default: null },
  digDaySyncError: { type: String, default: null },
  hubReplayUrl: { type: String, default: null },
  canReplay: { type: Boolean, default: false },
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

// we'll emit update:showTreasureOrder via @change above
defineEmits(['update:showTreasureOrder', 'update:hideLandIdInUrl', 'update:showPrediction', 'open-replay'])

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
