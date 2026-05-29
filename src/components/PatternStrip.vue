<template>
  <div class="pattern-strip">
    <component
      :is="readonly ? 'div' : 'button'"
      v-for="(key, i) in patternKeys"
      :key="i"
      :type="readonly ? undefined : 'button'"
      :aria-label="patternAriaLabel(key, i)"
      :title="patternTitle(key, i)"
      :class="thumbClass(i)"
      :data-tip="isServerCompleted(i) ? serverCompletedTooltip : undefined"
      @click="!readonly && $emit('toggle-mark', i)"
    >
      <span
        v-if="isServerCompleted(i)"
        class="pattern-thumb-check"
        aria-hidden="true"
      >✓</span>
      <div class="pattern-preview">
        <div
          v-for="cell in 16"
          :key="cell"
          class="pattern-cell"
        >
          <img
            v-if="getPlotAt(key, cell)"
            :src="getImageSrc(getPatternImageUrl(getPlotAt(key, cell).name)).value"
            :alt="getPlotAt(key, cell).name"
            class="w-full max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import {
  getPlotAt,
  getPatternImageUrl,
  patternLabel,
} from '@/utils/patternPreview.js'

const props = defineProps({
  patternKeys: { type: Array, default: () => [] },
  markedIndexes: { type: Array, default: () => [] },
  completedIndexes: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
})

defineEmits(['toggle-mark'])

const { getImageSrc } = useReliableAssets()

const serverCompletedTooltip =
  'Pattern solved — confirmed by the server'

const markedSet = computed(() => new Set(props.markedIndexes))
const completedSet = computed(() => new Set(props.completedIndexes))

function isMarked (index) {
  return markedSet.value.has(index)
}

function isServerCompleted (index) {
  return completedSet.value.has(index)
}

function thumbClass (index) {
  return [
    'max-w-[100px] pattern-thumb relative group overflow-hidden',
    props.readonly ? 'pattern-thumb--readonly' : 'cursor-pointer transition-shadow',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
    isServerCompleted(index)
      ? 'tooltip pattern-thumb--completed'
      : props.readonly ? '' : 'rounded-sm',
    isMarked(index)
      ? 'bg-success'
      : 'bg-base-100 dark:bg-neutral-content',
  ]
}

function patternTitle (key, index) {
  const label = patternLabel(key)
  return isServerCompleted(index)
    ? `${label} — ${serverCompletedTooltip}`
    : label
}

function patternAriaLabel (key, index) {
  return patternTitle(key, index)
}
</script>
