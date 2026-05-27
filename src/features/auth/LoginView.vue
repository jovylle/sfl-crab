<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body gap-4">
        <h1 class="card-title text-2xl justify-center">Sign in to d1g.uk</h1>
        <p class="text-sm text-base-content/70 text-center">
          We only use Google or a one-time email code—never a password.
          Your Sunflower Land game password is not us.
        </p>

        <button
          type="button"
          class="btn btn-outline btn-block gap-2"
          :disabled="busy"
          @click="signInWithGoogle"
        >
          Continue with Google
        </button>

        <div class="divider text-xs">or email</div>

        <template v-if="otpStep === 'email'">
          <label class="form-control w-full">
            <span class="label-text">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              class="input input-bordered w-full"
              placeholder="you@example.com"
              :disabled="busy"
              @keyup.enter="sendOtp"
            />
          </label>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy || !email.trim()"
            @click="sendOtp"
          >
            Send one-time code
          </button>
        </template>

        <template v-else>
          <p class="text-sm text-center">
            Code sent to <strong>{{ email }}</strong>
          </p>
          <label class="form-control w-full">
            <span class="label-text">6-digit code</span>
            <input
              v-model="otpCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="8"
              class="input input-bordered w-full text-center tracking-widest"
              placeholder="000000"
              :disabled="busy"
              @keyup.enter="verifyOtp"
            />
          </label>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy || !otpCode.trim()"
            @click="verifyOtp"
          >
            Verify code
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="busy"
            @click="otpStep = 'email'"
          >
            Use a different email
          </button>
        </template>

        <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

        <div class="divider" />

        <button
          type="button"
          class="btn btn-neutral btn-block"
          :disabled="busy"
          @click="continueAsGuest"
        >
          Continue as guest
        </button>
        <p class="text-xs text-center text-base-content/60">
          Guests only need a Land ID. Sign in optional—for hub profile and cross-device sync.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHubSession } from '@/composables/useHubSession.js'
import {
  sendEmailOtp,
  verifyEmailOtp,
  getGoogleAuthStartUrl,
  HubAuthError,
} from '@/services/hubAuthService.js'
import {
  setHubSession,
  readHubAnonymousId,
} from '@/composables/useHubSession.js'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useHubSession()

onMounted(() => {
  if (isAuthenticated.value) redirectAfterAuth()
})

const email = ref('')
const otpCode = ref('')
const otpStep = ref('email')
const busy = ref(false)
const error = ref('')

function redirectAfterAuth () {
  const target = typeof route.query.redirect === 'string'
    ? route.query.redirect
    : '/digging'
  router.replace(target.startsWith('/') ? target : '/digging')
}

function continueAsGuest () {
  redirectAfterAuth()
}

async function signInWithGoogle () {
  error.value = ''
  busy.value = true
  try {
    const returnUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
      typeof route.query.redirect === 'string' ? route.query.redirect : '/digging',
    )}`
    const url = await getGoogleAuthStartUrl(returnUrl)
    window.location.href = url
  } catch (err) {
    error.value =
      err instanceof HubAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Google sign-in failed'
  } finally {
    busy.value = false
  }
}

async function sendOtp () {
  error.value = ''
  busy.value = true
  try {
    await sendEmailOtp(email.value)
    otpStep.value = 'code'
  } catch (err) {
    error.value =
      err instanceof HubAuthError
        ? err.message
        : 'Could not send code. Try again later.'
  } finally {
    busy.value = false
  }
}

async function verifyOtp () {
  error.value = ''
  busy.value = true
  try {
    const data = await verifyEmailOtp(
      email.value,
      otpCode.value,
      readHubAnonymousId(),
    )
    const token = data?.token || data?.accessToken
    if (!token) {
      throw new HubAuthError('Hub did not return a session')
    }
    setHubSession({ token, user: data?.user })
    redirectAfterAuth()
  } catch (err) {
    error.value =
      err instanceof HubAuthError
        ? err.message
        : 'Invalid or expired code'
  } finally {
    busy.value = false
  }
}
</script>
