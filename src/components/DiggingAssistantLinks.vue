<template>
  <div :class="compact ? 'text-xs space-y-2' : 'text-sm space-y-4'">
    <h5 :class="compact ? 'font-semibold text-sm' : 'font-bold text-base'">
      SFL Digging Assistant Links
    </h5>

    <div>
      <span class="italic">Production:</span>
      <template v-for="(link, i) in productionLinks" :key="link.href">
        <a
          :href="link.href"
          class="link link-secondary ml-2 inline-block"
          rel="noopener noreferrer"
        >{{ link.label }}</a><span v-if="i < productionLinks.length - 1" class="mx-1">|</span>
      </template>
    </div>

    <div>
      <span class="italic">Development / Beta:</span>
      <template v-for="(link, i) in devLinks" :key="link.href">
        <a
          :href="link.href"
          class="link link-secondary ml-2 inline-block"
          rel="noopener noreferrer"
        >{{ link.label }}</a><span v-if="i < devLinks.length - 1" class="mx-1">|</span>
      </template>
    </div>

    <p :class="compact ? 'text-[0.7rem] text-base-content/50 leading-snug' : 'text-xs text-base-content/55'">
      <template v-if="isTestServer">
        Using
        <button
          type="button"
          class="word-toggle font-medium"
          @click="toggleTestnet"
        >testnet-server</button>.
        Example farm
        <button type="button" class="word-toggle font-mono" @click="openExampleTestLand">
          {{ testExampleLandId }}
        </button>
        ·
        <button type="button" class="word-toggle" @click="toggleTestnet">production</button>
      </template>
      <template v-else>
        Want to try
        <button type="button" class="word-toggle" @click="toggleTestnet">testnet-server</button>?
      </template>
    </p>
  </div>
</template>

<script setup>
import { useApiEnvironmentSwitch } from '@/composables/useApiEnvironmentSwitch.js'

defineProps({
  compact: { type: Boolean, default: false },
})

const productionLinks = [
  { href: 'https://sfl.uft1.com', label: 'sfl.uft1.com' },
  { href: 'https://sfl-digging.uft1.com', label: 'sfl-digging.uft1.com' },
  { href: 'https://d1g.uk', label: 'd1g.uk' },
]

const devLinks = [
  { href: 'https://sfl-development.uft1.com', label: 'sfl-development.uft1.com' },
  { href: 'https://development.d1g.uk', label: 'development.d1g.uk' },
  { href: 'https://beta.d1g.uk', label: 'beta.d1g.uk' },
]

const { isTestServer, toggleTestnet, openExampleTestLand, testExampleLandId } =
  useApiEnvironmentSwitch()
</script>

<style scoped>
.word-toggle {
  display: inline;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  text-decoration: none;
}
.word-toggle:hover {
  opacity: 0.75;
}
</style>
