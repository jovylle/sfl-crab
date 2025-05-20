<template>
  <div
    id="app"
    class="min-h-screen bg-base-200 bg-cross-lines text-base-content flex flex-col transition-colors duration-300"
  >
    <MainDrawer />
    <div
      class="flex flex-col min-h-screen p-4 md:p-6 w-full max-w-screen-xl mx-auto text-center "
    >
      <!-- Tabs -->
      <div class="tabs tabs-lift tabs-sm sm:tabs-md md:tabs-lg ">
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
      <EndSection />
      <footer class="py-6 text-center text-sm">
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


// read the current route so we can rebuild tabs when params change
const route = useRoute()

// define your tabs and their target routes
const tabs = computed(() => {
  const landId = route.params.landId

  return [
    // { label: 'Home',              to: { name: 'Home' } },
    { label: 'Digging',           to: landId
                                ? { name: 'Digging', params: { landId } }
                                : { name: 'GuestDigging' } },
    { label: 'Details',           to: landId
                                ? { name: 'LandDetailsWithId', params: { landId } }
                                : { name: 'LandDetailsNoId' } },
    { label: "Focused Checklist", to: landId
                                ? { name: 'TodaysChecklistWithId', params: { landId } }
                                : { name: 'TodaysChecklist' } },
  ]
})
</script>
