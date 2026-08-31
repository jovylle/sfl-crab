<template>
  <BaseModal :open="open" @close="close">
    <h3 class="font-bold text-lg">Send feedback</h3>
    <p class="text-sm text-base-content/70 mt-1">
      Bug reports, suggestions, or questions about the digging assistant.
    </p>

    <div v-if="prefill" class="mt-3 text-xs bg-base-200 rounded-lg p-2 space-y-0.5">
      <p v-if="prefill.tileLabel">Tile: <span class="font-semibold">{{ prefill.tileLabel }}</span></p>
      <p v-if="prefill.landId">Land ID: <span class="font-semibold">{{ prefill.landId }}</span></p>
    </div>

    <label class="form-control w-full mt-4">
      <span class="label-text">Message</span>
      <textarea
        v-model="message"
        class="textarea textarea-bordered w-full min-h-28"
        placeholder="What happened? What did you expect?"
        :disabled="status === 'sending'"
      />
    </label>

    <label class="form-control w-full mt-3">
      <span class="label-text">Email (optional)</span>
      <input
        v-model="email"
        type="email"
        class="input input-bordered w-full"
        placeholder="you@example.com"
        :disabled="status === 'sending'"
      />
    </label>

    <!-- screenshot attach disabled — image relay not working, text-only feedback -->

    <p v-if="error" class="text-error text-sm mt-3">{{ error }}</p>
    <p v-else-if="status === 'sent'" class="text-success text-sm mt-3">
      Thanks — your feedback was sent.
    </p>

    <template #actions>
      <button type="button" class="btn" :disabled="status === 'sending'" @click="close">
        {{ status === 'sent' ? 'Close' : 'Cancel' }}
      </button>
      <button
        v-if="status !== 'sent'"
        type="button"
        class="btn btn-primary"
        :disabled="!canSend"
        @click="send"
      >
        {{ status === 'sending' ? 'Sending…' : 'Send' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { submitWeb3FormsFeedback } from '@/utils/submitWeb3FormsFeedback.js'

const props = defineProps({
  open: { type: Boolean, required: true },
  prefill: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const message = ref('')
const email = ref('')
const status = ref('idle')
const error = ref('')

const canSend = computed(
  () => status.value !== 'sending' && message.value.trim().length > 0,
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    status.value = 'idle'
    error.value = ''
  },
)

function close () {
  emit('close')
}

async function send () {
  if (!canSend.value) return
  const messageText = message.value
  const emailText = email.value
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  status.value = 'sending'
  error.value = ''
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        email: emailText,
        pageUrl,
        landId: props.prefill?.landId ?? null,
        tileContext: props.prefill?.tileLabel
          ? { tileLabel: props.prefill.tileLabel, source: props.prefill.source ?? null }
          : null,
        screenshot: null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Could not send feedback.')
    }
    status.value = 'sent'
    message.value = ''
    email.value = ''
  } catch (err) {
    status.value = 'error'
    error.value = err.message || 'Could not send feedback.'
  }

  // Fire-and-forget: keep the existing email relay working, but never let it
  // affect the UI status — /api/feedback above is the durable source of truth.
  submitWeb3FormsFeedback({ message: messageText, email: emailText, pageUrl }).catch(() => {})
}
</script>
