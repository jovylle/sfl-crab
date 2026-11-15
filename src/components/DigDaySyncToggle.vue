<template>
  <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
    <label
      class="flex items-center rounded border p-2 tooltip cursor-pointer"
      :class="highlight ? 'border-primary' : 'border-base-300'"
      data-tip="Saves today's digs and marks to the d1g Hub so you can share a replay link. Off by default; nothing is sent until you turn this on."
    >
      <input
        type="checkbox"
        class="checkbox checkbox-sm mr-1"
        :checked="enabled"
        @change="$emit('update:enabled', $event.target.checked)"
      />
      Save and share this day
    </label>
    <template v-if="enabled">
      <span v-if="statusText" class="opacity-70" :class="{ 'text-error': status === 'error' }">
        {{ statusText }}
      </span>
      <a
        v-if="replayUrl"
        :href="replayUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-primary"
      >
        Open shared day
      </a>
    </template>
    <span v-else-if="signedIn" class="opacity-70">
      You are signed in to the Hub. Turn this on to save today.
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  enabled: { type: Boolean, default: false },
  status: { type: String, default: 'idle' },
  error: { type: String, default: null },
  signedIn: { type: Boolean, default: false },
  replayUrl: { type: String, default: null },
})

defineEmits(['update:enabled'])

const highlight = computed(() => props.signedIn && !props.enabled)

const statusText = computed(() => {
  switch (props.status) {
    case 'loading':
      return 'Loading saved day...'
    case 'syncing':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'auth_required':
    case 'error':
      return props.error || 'Could not save'
    default:
      return ''
  }
})
</script>
