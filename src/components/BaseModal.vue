<!-- src/components/BaseModal.vue -->
<template>
  <dialog :open="open" class="modal" @close="$emit('close')">
    <div class="modal-box">
      <slot />
      <div class="modal-action">
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>

<script setup>
defineProps({
  open: { type: Boolean, required: true }
})

defineEmits(['close'])
</script>
