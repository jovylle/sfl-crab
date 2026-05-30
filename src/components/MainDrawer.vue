<template>
  <div class="drawer drawer-end z-50">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <div class="drawer-side">
      <label for="main-drawer" class="drawer-overlay"></label>
      <div class="menu p-4 w-60 sm:w-80 min-h-full bg-base-100 text-base-content flex flex-col">
        <h2 class="text-xl font-bold mb-4">Menu</h2>
        <div class="divider px-5">Account</div>
        <AccountSection />
        <div class="divider px-5">Land Sync</div>
        <div>
          <LandControls />
        </div>
        <div class="divider px-5">More Pages</div>
        <div class="flex flex-col gap-2">
          <button class="btn btn-outline btn-sm justify-start" @click="goToDetails">
            Details
          </button>
          <button class="btn btn-outline btn-sm justify-start" @click="goToChecklist">
            Focused Checklist
          </button>
        </div>
        <div class="divider px-5 mt-auto">Theme</div>
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
import AccountSection from '@/components/AccountSection.vue'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'

const route = useRoute()
const router = useRouter()
const { isTestServer } = useApiEnvironment()
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
  const test = isTestServer.value
  router.push(
    resolveLandRoute(id ? 'details' : 'detailsNoId', { landId: id, test }),
  )
  closeDrawer()
}

function goToDigging() {
  const id = route.params.landId
  const test = isTestServer.value
  router.push(
    resolveLandRoute(id ? 'digging' : 'guestDigging', { landId: id, test }),
  )
}

function goToChecklist() {
  const id = route.params.landId
  const test = isTestServer.value
  router.push(
    resolveLandRoute(id ? 'checklist' : 'checklistNoId', { landId: id, test }),
  )
  closeDrawer()
}

function closeDrawer () {
  const checkbox = document.getElementById('main-drawer')
  if (checkbox instanceof HTMLInputElement) {
    checkbox.checked = false
  }
}
</script>
