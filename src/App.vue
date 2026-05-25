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
        class="tabs tabs-lift tabs-sm sm:tabs-md md:tabs-lg "
      >
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
      <!-- Only the active route’s component mounts here -->
      <main class="block bg-base-100 p-2 lg:p-6 flex-1">
        <router-view />
      </main>
      <EndSection v-if="!hideChrome" />
      <footer v-if="!hideChrome" class="py-6 text-center text-sm pb-1">
        <div class="w-full max-w-screen-lg mx-auto px-4">
          By the community for community Tool
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainDrawer from '@/components/MainDrawer.vue'
import EndSection from './components/EndSection.vue'
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
      label: 'Details',
      to: resolveLandRoute(landId ? 'details' : 'detailsNoId', { landId, test }),
    },
    {
      label: 'Focused Checklist',
      to: resolveLandRoute(landId ? 'checklist' : 'checklistNoId', { landId, test }),
    },
    {
      label: 'Practice',
      to: resolveLandRoute(landId ? 'practice' : 'practiceNoId', { landId, test }),
    },
  ]
})
</script>
