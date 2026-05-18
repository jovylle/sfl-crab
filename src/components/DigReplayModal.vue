<template>
  <dialog
    :open="open"
    class="modal"
    :class="{ 'modal-open': open }"
    @close="$emit('close')"
    @click.self="$emit('close')"
  >
    <div class="modal-box max-w-lg w-[95vw] p-4 sm:p-5">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 class="font-bold text-lg text-primary m-0">Dig replay</h3>
          <p class="text-xs text-base-content/70 m-0 mt-1">{{ stepLabel }}</p>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost"
          aria-label="Close replay"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <ReplayGrid
        :cells="replayCells"
        :treasure-order-map="replayOrderMap"
        :show-treasure-order="true"
      />

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
          ◀
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
          ▶
        </button>
      </div>

      <p class="text-[0.65rem] text-base-content/60 m-0 mt-3 text-center">
        Step 0 = before any dig. You do not need to finish the desert to replay.
      </p>

      <div
        v-if="hubReplayUrl"
        class="modal-action flex-wrap justify-center gap-2 mt-2 sm:mt-0"
      >
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          @click="copyHubLink"
        >
          {{ hubCopied ? 'Link copied' : 'Copy share link' }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-secondary"
          @click="openHub"
        >
          Open on Hub ↗
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" @click.prevent="$emit('close')">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import ReplayGrid from '@/components/ReplayGrid.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  step: { type: Number, default: 0 },
  maxStep: { type: Number, default: 0 },
  stepLabel: { type: String, default: '' },
  isPlaying: { type: Boolean, default: false },
  replayCells: { type: Array, default: () => [] },
  replayOrderMap: { type: Array, default: () => [] },
  hubReplayUrl: { type: String, default: null },
})

defineEmits(['close', 'prev', 'next', 'update:step', 'toggle-play'])

const hubCopied = ref(false)
let hubCopiedTimer = null

function openHub () {
  if (!props.hubReplayUrl) return
  window.open(props.hubReplayUrl, '_blank', 'noopener,noreferrer')
}

async function copyHubLink () {
  if (!props.hubReplayUrl) return
  try {
    await navigator.clipboard.writeText(props.hubReplayUrl)
    hubCopied.value = true
    if (hubCopiedTimer) clearTimeout(hubCopiedTimer)
    hubCopiedTimer = setTimeout(() => {
      hubCopied.value = false
    }, 2000)
  } catch {
    openHub()
  }
}
</script>
