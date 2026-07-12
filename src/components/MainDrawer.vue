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
          <button class="btn btn-outline btn-sm btn-block justify-start" @click="goToDetails">
            Details
          </button>
          <button class="btn btn-outline btn-sm btn-block justify-start" @click="goToChecklist">
            Focused Checklist
          </button>
        </div>
        <div class="divider px-5 mt-auto">Theme</div>
        <div class="mb-8">
          <ThemeToggle />
        </div>
        <div v-if="showSupportSection" class="divider px-5">Support</div>
        <div v-if="showSupportSection" class="flex flex-col gap-2">
          <template v-if="kofiUrl">
            <a
              :href="kofiUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-block"
              @click="closeDrawer"
            >
              Support d1g.uk ☕
            </a>
            <p class="text-xs text-base-content/60 px-1 leading-snug">
              Free forever. Optional tips help pay hosting.
            </p>
          </template>
          <button
            v-if="isProjectMateReady"
            class="btn btn-primary btn-block"
            @click="openProjectMate"
          >
            Open Help
          </button>
          <button
            v-if="hasFeedbackForm"
            class="btn btn-outline btn-block"
            @click="openFeedback"
          >
            Send feedback
          </button>
        </div>
      </div>
    </div>
  </div>

  <FeedbackModal :open="feedbackOpen" @close="feedbackOpen = false" />
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LandControls from '@/components/LandControls.vue'
import AccountSection from '@/components/AccountSection.vue'
import FeedbackModal from '@/components/FeedbackModal.vue'
import { resolveLandRoute } from '@/utils/landRoutes.js'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'

const route = useRoute()
const router = useRouter()
const { isTestServer } = useApiEnvironment()
const isProjectMateReady = ref(false)
const feedbackOpen = ref(false)
const hasFeedbackForm = Boolean(import.meta.env.VITE_PROJECTMATE_WEB3FORMS_KEY)
const showSupportSection = computed(
  () => isProjectMateReady.value || hasFeedbackForm,
)

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
  closeDrawer()
}

function openFeedback () {
  feedbackOpen.value = true
  closeDrawer()
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
