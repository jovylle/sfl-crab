<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body items-center text-center gap-3">
        <span v-if="!error" class="loading loading-spinner loading-lg text-primary" />
        <h1 class="card-title text-xl">
          {{ error ? 'Sign-in failed' : 'Completing sign-in…' }}
        </h1>
        <p v-if="error" class="text-error text-sm">{{ error }}</p>
        <router-link v-if="error" to="/login" class="btn btn-primary btn-sm">
          Back to sign in
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setHubSession, readHubAnonymousId } from '@/composables/useHubSession.js'
import { fetchMe } from '@/services/hubAuthService.js'

const route = useRoute()
const router = useRouter()
const error = ref('')

onMounted(async () => {
  const tokenFromQuery =
    (typeof route.query.token === 'string' && route.query.token) ||
    (typeof route.hash === 'string' && route.hash.startsWith('#token=')
      ? route.hash.slice(7)
      : '')

  if (!tokenFromQuery) {
    error.value = 'Missing sign-in token. Try again from the login page.'
    return
  }

  setHubSession({ token: tokenFromQuery })

  try {
    const user = await fetchMe(readHubAnonymousId())
    if (user) {
      setHubSession({ token: tokenFromQuery, user })
    }
  } catch {
    /* token may still work for Bearer calls */
  }

  const redirect =
    typeof route.query.redirect === 'string' ? route.query.redirect : '/digging'
  router.replace(redirect.startsWith('/') ? redirect : '/digging')
})
</script>
