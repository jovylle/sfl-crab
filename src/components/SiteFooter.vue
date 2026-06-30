<template>
  <footer class="site-footer-bar py-4 text-center text-sm text-base-content/70">
    <p class="mb-2">Free digging tool for Sunflower Land players</p>
    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      <a
        :href="KOFI_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-primary font-medium"
      >
        Support d1g.uk ☕
      </a>
      <span class="text-base-content/30" aria-hidden="true">·</span>
      <a
        href="https://github.com/jovylle/sfl-crab"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-hover"
      >
        GitHub
      </a>
      <span class="text-base-content/30" aria-hidden="true">·</span>
      <a
        href="https://github.com/jovylle/sfl-crab/issues"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-hover"
      >
        Feedback
      </a>
    </div>
    <p v-if="buildHash" class="mt-2 text-[0.6rem] text-base-content/30 font-mono">
      build {{ buildHash }}
    </p>
  </footer>
</template>

<script setup>
import { KOFI_URL } from '@/config/support.js'

const buildHash = typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__
  ? String(__APP_VERSION__).slice(0, 7)
  : ''
</script>
