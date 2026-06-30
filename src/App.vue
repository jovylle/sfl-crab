<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 bg-cross-lines text-base-content flex flex-col transition-colors duration-300"
  >
    <MainDrawer v-if="!hideChrome" />
    <div
      class="flex flex-col min-h-screen p-4 md:p-6 w-full max-w-screen-xl mx-auto text-center "
    >
      <!-- Tabs -->
      <div
        v-if="!hideChrome"
        class="flex items-end justify-between gap-2"
      >
        <div class="tabs tabs-lift tabs-sm sm:tabs-md md:tabs-lg flex-1">
          <!-- Turn each tab into a router-link -->
          <router-link
            v-for="tab in tabs"
            :key="tab.label"
            :to="tab.to"
            class="tab flex items-center"
            active-class="tab-active"
          >
            <!-- optional: your SVG icon goes here before the text -->
            <span class="truncate">{{ tab.label }}</span>
          </router-link>
        </div>
        <label
          for="main-drawer"
          class="btn btn-primary btn-sm sm:btn-md rounded-xl mb-1 shadow-none border border-base-300 border-b-0 px-4 shrink-0"
          aria-label="Open menu"
          title="Open menu"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5 text-white dark:text-black"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </label>
      </div>
      <!-- Only the active route’s component mounts here -->
      <main class="block bg-base-100 p-2 lg:p-6 flex-1">
        <router-view />
      </main>
      <EndSection v-if="!hideChrome" />
      <SiteFooter v-if="!hideChrome" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainDrawer from '@/components/MainDrawer.vue'
import EndSection from '@/components/EndSection.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import { isTestApiEnvironment } from '@/config/api.js'

const route = useRoute()

const hideChrome = computed(() => Boolean(route.meta.hideChrome))

const tabs = computed(() => {
  const landId = route.params.landId
  const test = isTestApiEnvironment()

  return [
    {
      label: 'Digging',
      to: resolveLandRoute(landId ? 'digging' : 'guestDigging', { landId, test }),
    },
    {
      label: 'Practice',
      to: resolveLandRoute(landId ? 'practice' : 'practiceNoId', { landId, test }),
    },
  ]
})
</script>
