<!-- src/components/SflGateEmptyState.vue -->
<template>
  <div class="card bg-base-100 shadow-md border border-warning/30 max-w-[520px] mx-auto w-full">
    <div class="card-body items-center text-center gap-3 py-8 px-5">
      <div class="text-5xl leading-none" aria-hidden="true">⛏️</div>
      <h2 class="card-title text-xl">Live digging data unavailable</h2>
      <p class="text-sm text-base-content/80 max-w-prose">
        On <strong>27 Aug 2026</strong> Sunflower Land updated Community API keys to require
        <strong>VIP Access + Bumpkin Level 50</strong>. Our shared server key doesn't meet that,
        so <code class="text-xs bg-base-200 px-1 py-0.5 rounded">api.sunflower-land.com</code>
        returns <span class="font-mono text-xs">“VIP access and a Bumpkin of level 50 or higher”</span>
        for every farm. This affects all third-party tools, not just d1g.uk.
      </p>
      <p v-if="errorMessage" class="text-xs font-mono bg-warning/15 border border-warning/20 rounded-lg px-3 py-2 max-w-full break-words">
        {{ errorMessage }}
      </p>
      <div class="card-actions justify-center flex-wrap gap-2 mt-2">
        <router-link to="/practice" class="btn btn-primary btn-sm">Try Practice Mode</router-link>
        <router-link to="/status" class="btn btn-outline btn-sm">Learn more</router-link>
        <router-link to="/status#self-host" class="btn btn-ghost btn-sm">How to self-host →</router-link>
      </div>
      <p class="text-xs text-base-content/60 mt-1">
        What still works: Practice simulator, manual hint entry, board links (<code>?board=</code> / <code>?marks=</code>), and your dig history.
        <span class="block mt-1 opacity-70">Not affiliated with Thought Farm / Sunflower Land.</span>
      </p>
      <button
        v-if="onRetry"
        type="button"
        class="btn btn-ghost btn-xs mt-2"
        :disabled="isLoading"
        @click="onRetry"
      >
        <span v-if="isLoading" class="loading loading-spinner loading-xs" /> Retry
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  errorMessage: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  onRetry: { type: Function, default: null },
})
</script>
