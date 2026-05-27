<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body gap-4">
        <h1 class="card-title text-2xl justify-center">Approve login to d1g.uk</h1>
        <p class="text-sm text-base-content/70 text-center">
          We only use Google or an email approval link—never a password.
          Approval works for both sign up and login.
        </p>

        <button
          type="button"
          class="btn btn-outline btn-block gap-2"
          :disabled="busy"
          @click="signInWithGoogle"
        >
          Continue with Google
        </button>

        <div class="divider text-xs">or email approve</div>

        <template v-if="loginStep === 'email'">
          <label class="form-control w-full">
            <span class="label-text">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              class="input input-bordered w-full"
              placeholder="you@example.com"
              :disabled="busy"
              @keyup.enter="sendApprovalLink"
            />
          </label>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy || !email.trim()"
            @click="sendApprovalLink"
          >
            Send approval email
          </button>
        </template>

        <template v-else-if="loginStep === 'pending'">
          <p class="text-sm text-center">
            Approval email sent to <strong>{{ email }}</strong>.
            Open the email and approve sign in.
          </p>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy"
            @click="refreshApproval"
          >
            I approved, refresh
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-block"
            :disabled="busy"
            @click="sendApprovalLink"
          >
            Resend approval email
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-block"
            :disabled="busy"
            @click="loginStep = 'email'"
          >
            Use a different email
          </button>
          <button
            type="button"
            class="btn btn-link btn-xs"
            :disabled="busy"
            @click="loginStep = 'code'"
          >
            Use approval code instead
          </button>
        </template>

        <template v-else>
          <p class="text-sm text-center">
            Enter approval code for <strong>{{ email }}</strong> (fallback).
          </p>
          <label class="form-control w-full">
            <span class="label-text">Approval code</span>
            <input
              v-model="otpCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="8"
              class="input input-bordered w-full text-center tracking-widest"
              placeholder="000000"
              :disabled="busy"
              @keyup.enter="verifyFallbackCode"
            />
          </label>
          <button
            type="button"
            class="btn btn-primary btn-block"
            :disabled="busy || !otpCode.trim()"
            @click="verifyFallbackCode"
          >
            Verify code
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-block"
            :disabled="busy"
            @click="loginStep = 'pending'"
          >
            Back to approval refresh
          </button>
        </template>

        <p v-if="notice" class="text-info text-sm text-center">{{ notice }}</p>
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
import {
  requestEmailApproval,
  checkEmailApproval,
  sendEmailOtp,
  verifyEmailOtp,
  getGoogleAuthStartUrl,
  HubAuthError,
} from '@/services/hubAuthService.js'
import {
  useHubSession,
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
const loginStep = ref('email')
const notice = ref('')
const busy = ref(false)
const error = ref('')
const pendingRequest = ref(null)

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
  notice.value = ''
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

function authReturnUrl () {
  return `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
    typeof route.query.redirect === 'string' ? route.query.redirect : '/digging',
  )}`
}

function parseRequestRef (data) {
  if (!data || typeof data !== 'object') return null
  return data.requestId || data.challengeId || data.flowId || data.id || null
}

async function sendApprovalLink () {
  notice.value = ''
  error.value = ''
  busy.value = true
  try {
    const data = await requestEmailApproval(email.value, {
      anonymousId: readHubAnonymousId(),
      returnUrl: authReturnUrl(),
    })
    pendingRequest.value = {
      requestId: parseRequestRef(data),
      challengeId: data?.challengeId || null,
      flowId: data?.flowId || null,
    }
    loginStep.value = 'pending'
    notice.value = 'Approval email sent. After approving, tap refresh.'
  } catch (err) {
    // Fallback for old hubs that still expose OTP only.
    if (err instanceof HubAuthError && err.status === 404) {
      try {
        await sendEmailOtp(email.value)
        loginStep.value = 'code'
        notice.value = 'Code flow is active on this server. Check email for approval code.'
        return
      } catch (otpErr) {
        error.value =
          otpErr instanceof HubAuthError
            ? otpErr.message
            : 'Could not send approval email. Try again later.'
      }
    } else {
      error.value =
        err instanceof HubAuthError
          ? err.message
          : 'Could not send approval email. Try again later.'
    }
  } finally {
    busy.value = false
  }
}

async function refreshApproval () {
  notice.value = ''
  error.value = ''
  busy.value = true
  try {
    const data = await checkEmailApproval({
      email: email.value,
      anonymousId: readHubAnonymousId(),
      requestId: pendingRequest.value?.requestId || undefined,
      challengeId: pendingRequest.value?.challengeId || undefined,
      flowId: pendingRequest.value?.flowId || undefined,
    })
    const token = data?.token || data?.accessToken
    if (!token) {
      throw new HubAuthError('Approval pending. Open the email link first, then refresh.')
    }
    setHubSession({ token, user: data?.user })
    redirectAfterAuth()
  } catch (err) {
    error.value =
      err instanceof HubAuthError
        ? err.message
        : 'Approval not completed yet'
  } finally {
    busy.value = false
  }
}

async function verifyFallbackCode () {
  notice.value = ''
  error.value = ''
  busy.value = true
  try {
    const data = await verifyEmailOtp(email.value, otpCode.value, readHubAnonymousId())
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
