<template>
  <dialog
    :open="open"
    class="modal"
    :class="{ 'modal-open': open }"
    @close="$emit('close')"
    @click.self="closeOnBackdrop && $emit('close')"
  >
    <div
      class="modal-box relative"
      :class="[
        sizeClass,
        bodyPaddingClass,
      ]"
    >
      <button
        v-if="showCloseButton"
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute top-3 right-3 z-10"
        :aria-label="closeLabel"
        @click="$emit('close')"
      >
        ✕
      </button>

      <header v-if="$slots.header || title || subtitle" class="mb-3 pr-8">
        <slot name="header">
          <h3 v-if="title" class="font-bold text-lg m-0">{{ title }}</h3>
          <p v-if="subtitle" class="text-sm text-base-content/70 mt-1 mb-0">
            {{ subtitle }}
          </p>
        </slot>
      </header>

      <slot />

      <div v-if="$slots.actions" class="modal-action mt-4">
        <slot name="actions" />
      </div>
    </div>

    <form v-if="showBackdrop" method="dialog" class="modal-backdrop">
      <button type="submit" @click.prevent="$emit('close')">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl', 'full'].includes(v),
  },
  padded: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true },
  showBackdrop: { type: Boolean, default: true },
  closeLabel: { type: String, default: 'Close modal' },
})

defineEmits(['close'])

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-sm w-[95vw]'
    case 'lg': return 'max-w-3xl w-[95vw]'
    case 'xl': return 'max-w-5xl w-[95vw]'
    case 'full': return 'max-w-[95vw] w-[95vw]'
    default: return 'max-w-lg w-[95vw]'
  }
})

const bodyPaddingClass = computed(() => (props.padded ? 'p-4 sm:p-5' : 'p-0'))
</script>
