<template>
  <div
    v-if="open"
    class="rounded-lg border border-primary/30 bg-base-200/95 p-3 mb-2 shadow-sm"
    role="region"
    aria-label="Dig replay"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <span class="text-sm font-semibold text-primary">Replay</span>
      <span class="text-xs text-base-content/70">{{ stepLabel }}</span>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        @click="$emit('close')"
      >
        Exit
      </button>
    </div>

    <div class="flex items-center gap-2">
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
        class="range range-primary range-xs flex-1 min-w-[120px]"
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

    <p class="text-[0.65rem] text-base-content/60 m-0 mt-2 text-center">
      Step 0 = before any dig. Marks appear when they were placed (by dig order).
    </p>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  step: { type: Number, default: 0 },
  maxStep: { type: Number, default: 0 },
  stepLabel: { type: String, default: '' },
})

defineEmits(['close', 'prev', 'next', 'update:step'])
</script>
