<template>
  <dialog
    :open="open"
    class="modal"
    :class="{ 'modal-open': open }"
    @close="$emit('close')"
    @click.self="$emit('close')"
  >
    <div class="modal-box max-w-lg w-[95vw] p-4 sm:p-5 relative">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute top-3 right-3 z-10"
        aria-label="Close replay"
        @click="$emit('close')"
      >
        <Icon icon="mdi:close" class="w-4 h-4" />
      </button>

      <div
        ref="captureEl"
        class="replay-export bg-base-100 rounded-lg pr-8"
        :class="{ 'replay-export-capturing': exportingGif }"
      >
        <div class="mb-3">
          <h3 class="font-bold text-lg text-primary m-0">Dig replay</h3>
          <p class="text-xs text-base-content/70 m-0 mt-1">{{ stepLabel }}</p>
        </div>

        <div class="replay-capture bg-base-200/30 rounded-lg p-1">
          <ReplayGrid
            :cells="replayCells"
            :treasure-order-map="replayOrderMap"
            :show-treasure-order="true"
          />
        </div>

        <p class="text-[0.65rem] text-base-content/60 m-0 mt-3 text-center">
          Step 0 = before any dig. Marks show when they were placed. Partial sessions replay fine.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 mt-4">
        <button
          type="button"
          class="btn btn-sm btn-primary"
          @click="$emit('toggle-play')"
        >
          {{ isPlaying ? 'Pause' : 'Play' }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline"
          :disabled="step <= 0"
          aria-label="Previous step"
          @click="$emit('prev')"
        >
          <Icon icon="mdi:chevron-left" class="w-4 h-4" />
        </button>
        <input
          type="range"
          class="range range-primary range-xs flex-1 min-w-[100px]"
          :min="0"
          :max="maxStep"
          :value="step"
          @input="$emit('update:step', Number($event.target.value))"
        />
        <button
          type="button"
          class="btn btn-sm btn-outline"
          :disabled="step >= maxStep"
          aria-label="Next step"
          @click="$emit('next')"
        >
          <Icon icon="mdi:chevron-right" class="w-4 h-4" />
        </button>
      </div>

      <div class="modal-action flex-wrap justify-center gap-2 mt-2 sm:mt-0">
        <button
          v-if="replayShareUrl"
          type="button"
          class="btn btn-sm btn-ghost"
          @click="copyReplayLink"
        >
          {{ replayCopied ? 'Replay link copied' : 'Copy replay link' }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-secondary"
          :disabled="exportingGif || maxStep < 1"
          @click="exportGif"
        >
          {{ exportingGif ? exportProgressLabel : 'Export GIF' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" @click.prevent="$emit('close')">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import ReplayGrid from '@/components/ReplayGrid.vue'
import { buildReplayShareUrl } from '@/utils/shareLinks.js'
import { exportReplayGif, downloadGif } from '@/utils/exportReplayGif.js'
import { copyToClipboard } from '@/utils/gridStateCodec.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  landId: { type: String, default: '' },
  step: { type: Number, default: 0 },
  maxStep: { type: Number, default: 0 },
  stepLabel: { type: String, default: '' },
  isPlaying: { type: Boolean, default: false },
  replayCells: { type: Array, default: () => [] },
  replayOrderMap: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'close',
  'prev',
  'next',
  'update:step',
  'toggle-play',
  'pause',
])

const captureEl = ref(null)
const replayCopied = ref(false)
const exportingGif = ref(false)
const exportProgressLabel = ref('Exporting…')
let replayCopiedTimer = null

const replayShareUrl = computed(() => buildReplayShareUrl(props.landId))

async function copyReplayLink () {
  const url = replayShareUrl.value
  if (!url) return
  const ok = await copyToClipboard(url)
  if (!ok) return
  replayCopied.value = true
  if (replayCopiedTimer) clearTimeout(replayCopiedTimer)
  replayCopiedTimer = setTimeout(() => {
    replayCopied.value = false
  }, 2000)
}

async function exportGif () {
  if (exportingGif.value || !captureEl.value || props.maxStep < 1) return

  exportingGif.value = true
  exportProgressLabel.value = 'Exporting…'
  emit('pause')
  await nextTick()

  const savedStep = props.step
  try {
    const bytes = await exportReplayGif({
      element: captureEl.value,
      maxStep: props.maxStep,
      setStep: async (n) => {
        emit('update:step', n)
        await nextTick()
      },
      onProgress: (s, total) => {
        exportProgressLabel.value = `Frame ${s}/${total}…`
      },
    })
    const id = props.landId || 'replay'
    downloadGif(bytes, `dig-replay-${id}.gif`)
  } catch (err) {
    console.error('GIF export failed:', err)
    exportProgressLabel.value = 'Export failed'
    await new Promise((r) => setTimeout(r, 1500))
  } finally {
    emit('update:step', savedStep)
    exportingGif.value = false
    exportProgressLabel.value = 'Export GIF'
  }
}
</script>

<style scoped>
/* GIF capture must not catch .tile background-color mid-transition (style.css 0.1s). */
.replay-export-capturing :deep(.tile) {
  transition: none !important;
}
</style>
