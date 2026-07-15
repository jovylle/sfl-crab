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

    <div class="mt-3 space-y-2">
      <label
        v-if="hasGridOnPage"
        class="flex items-center gap-2 cursor-pointer"
      >
        <input
          v-model="attachScreenshot"
          type="checkbox"
          class="checkbox checkbox-sm"
          :disabled="status === 'sending' || capturingScreenshot"
        />
        <span class="label-text">Attach a screenshot of the grid</span>
        <span v-if="capturingScreenshot" class="loading loading-spinner loading-xs" />
      </label>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn btn-xs btn-outline"
          :disabled="status === 'sending'"
          @click="fileInputRef?.click()"
        >
          Upload screenshot
        </button>
        <span class="text-xs opacity-60">or paste an image (Ctrl+V / Cmd+V)</span>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileSelected"
        />
      </div>
    </div>
    <p v-if="screenshotError" class="text-warning text-xs mt-1">{{ screenshotError }}</p>

    <div v-if="screenshotDataUrl" class="mt-2 relative inline-block">
      <img :src="screenshotDataUrl" class="max-h-28 rounded border border-base-300" alt="Screenshot preview" />
      <button
        type="button"
        class="btn btn-xs btn-circle absolute -top-2 -right-2"
        title="Remove screenshot"
        @click="removeScreenshot"
      >
        ✕
      </button>
    </div>

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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toCanvas } from 'html-to-image'
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

const attachScreenshot = ref(false)
const screenshotDataUrl = ref('')
const screenshotSource = ref('') // '' | 'grid' | 'file'
const capturingScreenshot = ref(false)
const screenshotError = ref('')
const hasGridOnPage = ref(false)
const fileInputRef = ref(null)

const canSend = computed(
  () => status.value !== 'sending' && message.value.trim().length > 0,
)

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', onWindowPaste)
      if (isOpen) window.addEventListener('paste', onWindowPaste)
    }
    if (!isOpen) return
    status.value = 'idle'
    error.value = ''
    attachScreenshot.value = false
    screenshotDataUrl.value = ''
    screenshotSource.value = ''
    screenshotError.value = ''
    hasGridOnPage.value =
      typeof document !== 'undefined' && Boolean(document.querySelector('.contain-please'))
  },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('paste', onWindowPaste)
})

watch(attachScreenshot, async (checked) => {
  if (!checked) {
    if (screenshotSource.value === 'grid') {
      screenshotDataUrl.value = ''
      screenshotSource.value = ''
    }
    return
  }
  screenshotError.value = ''
  capturingScreenshot.value = true
  try {
    const el = document.querySelector('.contain-please')
    if (!el) throw new Error('No grid found on this page')
    const canvas = await toCanvas(el, { pixelRatio: 1, cacheBust: true })
    screenshotDataUrl.value = canvas.toDataURL('image/jpeg', 0.5)
    screenshotSource.value = 'grid'
  } catch {
    attachScreenshot.value = false
    screenshotDataUrl.value = ''
    screenshotError.value = 'Could not capture screenshot.'
  } finally {
    capturingScreenshot.value = false
  }
})

async function fileToCompressedDataUrl (file) {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = rawDataUrl
  })
  const maxDim = 1600
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale) || img.width
  canvas.height = Math.round(img.height * scale) || img.height
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.6)
}

async function applyImageFile (file) {
  if (!file || !file.type?.startsWith('image/') || status.value === 'sending') return
  screenshotError.value = ''
  capturingScreenshot.value = true
  try {
    screenshotDataUrl.value = await fileToCompressedDataUrl(file)
    screenshotSource.value = 'file'
    attachScreenshot.value = false
  } catch {
    screenshotError.value = 'Could not read that image.'
  } finally {
    capturingScreenshot.value = false
  }
}

function onFileSelected (event) {
  const file = event.target.files?.[0]
  applyImageFile(file)
  event.target.value = ''
}

function onWindowPaste (event) {
  if (!props.open) return
  const item = Array.from(event.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
  if (!item) return
  event.preventDefault()
  applyImageFile(item.getAsFile())
}

function removeScreenshot () {
  attachScreenshot.value = false
  screenshotDataUrl.value = ''
  screenshotSource.value = ''
}

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
        screenshot: screenshotDataUrl.value || null,
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
