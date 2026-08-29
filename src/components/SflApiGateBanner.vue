<!-- src/components/SflApiGateBanner.vue -->
<template>
  <div
    v-if="!dismissed"
    class="alert alert-warning text-sm py-2.5 px-3 mb-3 shadow-sm rounded-xl flex items-center gap-2 text-left"
    role="status"
    aria-live="polite"
  >
    <span class="text-lg leading-none shrink-0" aria-hidden="true">⛏️</span>
    <span class="flex-1 min-w-0">
      <span class="font-semibold">Live digging unavailable</span>
      <span class="hidden sm:inline"> — API requirement prevents connection to the game server.</span>
      <span class="sm:hidden"> — can't connect to game server.</span>
      <span class="hidden md:inline"> We're reaching out to the SFL team.</span>
      <router-link to="/status" class="link link-primary font-medium ml-1 whitespace-nowrap">Status →</router-link>
    </span>
    <router-link to="/status" class="btn btn-ghost btn-xs shrink-0 hidden sm:inline-flex">Self-host</router-link>
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle shrink-0"
      aria-label="Dismiss"
      title="Dismiss"
      @click="dismiss"
    >✕</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'sfl-api-gate-dismissed'
const dismissed = ref(false)

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(STORAGE_KEY) === '1'
  } catch { /* ignore */ }
})

function dismiss () {
  dismissed.value = true
  try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
}
</script>
