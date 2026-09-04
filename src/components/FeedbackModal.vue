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

    <label class="form-control w-full mt-3">
      <span class="label-text">Display name (optional — shown if published)</span>
      <input
        v-model="displayName"
        type="text"
        maxlength="40"
        class="input input-bordered w-full"
        placeholder="Farmer Joe"
        :disabled="status === 'sending'"
      />
    </label>

    <!-- screenshot attach disabled — image relay not working, text-only feedback -->

    <label class="flex items-start gap-2 mt-4 cursor-pointer">
      <input
        v-model="allowPublicDisplay"
        type="checkbox"
        class="checkbox checkbox-sm checkbox-primary mt-0.5"
        :disabled="status === 'sending'"
      />
      <span class="text-xs leading-4 text-base-content/70">
        Allow my feedback to be shown publicly on d1g.uk (only your message + display name will be shown; email stays private)
      </span>
    </label>

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
const displayName = ref('')
const allowPublicDisplay = ref(false)
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
  const displayNameText = displayName.value.trim().slice(0, 40)
  const allowPublic = !!allowPublicDisplay.value
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
        displayName: displayNameText || null,
        allowPublicDisplay: allowPublic,
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
    displayName.value = ''
    allowPublicDisplay.value = false
  } catch (err) {
    status.value = 'error'
    error.value = err.message || 'Could not send feedback.'
  }

  // Fire-and-forget: keep email relay, but never block UI — /api/feedback is source of truth.
  submitWeb3FormsFeedback({ message: messageText, email: emailText, pageUrl }).catch(() => {})

  // Dual-write to Cloudflare Worker (projectmate) if configured — enables public display without Netlify.
  // Set VITE_PROJECTMATE_ISSUES_ENDPOINT e.g. https://projectmate-issues-api.<account>.workers.dev
  const issuesEndpoint = import.meta.env.VITE_PROJECTMATE_ISSUES_ENDPOINT
  if (issuesEndpoint) {
    const base = issuesEndpoint.replace(/\/+$/, '')
    fetch(`${base}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: import.meta.env.VITE_PROJECTMATE_PROJECT_ID || 'sfl-crab',
        message: messageText,
        email: emailText || undefined,
        meta: {
          parentHref: pageUrl || undefined,
          allowPublicDisplay: allowPublic,
          displayName: displayNameText || undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
        interactions: [],
      }),
    }).catch(() => {})
  }
}
</script>
