<template>
  <div class="drawer drawer-end z-50">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <!-- FAB Toggle Button -->
    <div class="fixed bottom-4 right-4">
      <label
        for="main-drawer"
        class="btn btn-primary btn-lg btn-circle shadow-xl text-2xl"
      >
        <span class="-mt-1 text-white dark:text-black">☰</span>
      </label>
    </div>

    <!-- Drawer Content -->
    <div class="drawer-side">
      <label for="main-drawer" class="drawer-overlay"></label>
      <div class="menu p-4 w-60 sm:w-80 min-h-full bg-base-100 text-base-content">
        <h2 class="text-xl font-bold mb-4">Menu</h2>
        <div class="divider px-5">Pages</div>
        <ul class="space-y-2 my-4 mb-auto">
          <!-- Land Details Navigation -->
          <li>
            <button
              class="btn btn-large py-6 btn-block"
              @click="goToDetails"
            >
              Land Raw Details
            </button>
          </li>
          <!-- Digging -->
          <li>
            <button
              class="btn btn-large py-6 btn-block"
              @click="goToDigging"
            >
              Digging
            </button>
          </li>
          <!-- Today’s Checklist -->
          <li>
            <button
              class="btn btn-large py-6 btn-block"
              @click="goToChecklist"
            >
              Today’s Checklist
            </button>
          </li>
        </ul>
        <div class="divider px-5">Land Sync</div>
        <div>
          <LandControls />
        </div>
        <div class="divider px-5">API server</div>
        <div class="mb-6">
          <ApiEnvironmentToggle />
        </div>
        <div class="divider px-5">Theme</div>
        <div class="mb-8">
          <ThemeToggle />
        </div>
        <div v-if="isProjectMateReady" class="divider px-5">Support</div>
        <button
          v-if="isProjectMateReady"
          class="btn btn-primary btn-block"
          @click="openProjectMate"
        >
          Open Help
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LandControls from '@/components/LandControls.vue'
import ApiEnvironmentToggle from '@/components/ApiEnvironmentToggle.vue'

const route = useRoute()
const router = useRouter()
const isProjectMateReady = ref(false)

function syncProjectMateReady () {
  isProjectMateReady.value = Boolean(
    window.ProjectMate && typeof window.ProjectMate.open === 'function'
  )
}

function onProjectMateReadyEvent (event) {
  isProjectMateReady.value = Boolean(event?.detail?.ready)
}

function openProjectMate () {
  if (window.ProjectMate && typeof window.ProjectMate.open === 'function') {
    window.ProjectMate.open()
  }
}

onMounted(() => {
  syncProjectMateReady()
  window.addEventListener('projectmate:ready', onProjectMateReadyEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener('projectmate:ready', onProjectMateReadyEvent)
})

function goToDetails() {
  const id = route.params.landId
  if (id) {
    router.push({ name: 'LandDetailsWithId', params: { landId: id } })
  } else {
    router.push({ name: 'LandDetailsNoId' })
  }
}

function goToDigging() {
  const id = route.params.landId
  if (id) {
    router.push({ name: 'Digging', params: { landId: id } })
  } else {
    router.push({ name: 'Digging' })
  }
}

function goToChecklist() {
  const id = route.params.landId
  if (id) {
    router.push({ name: 'TodaysChecklistWithId', params: { landId: id } })
  } else {
    router.push({ name: 'TodaysChecklist' })
  }
}
</script>
