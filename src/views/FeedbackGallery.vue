<!-- src/views/FeedbackGallery.vue — public wall of approved feedback (Cloudflare D1) + legacy screenshots -->
<template>
  <div class="p-4 max-w-4xl mx-auto w-full">
    <h1 class="text-2xl font-bold mb-1">Community feedback</h1>
    <p class="text-sm text-base-content/70 mb-4">
      Real messages from players who allowed public display. Approved by Jov.
    </p>

    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <p v-else-if="error" class="alert alert-error text-sm">{{ error }}</p>

    <template v-else>
      <div v-if="!configured" class="alert text-sm mb-4">
        Public feedback feed is not configured yet.
      </div>
      <div v-else-if="!items.length" class="text-sm opacity-60 py-6 text-center">
        No public feedback yet — be the first from the menu → Send feedback (tick “allow public display”).
      </div>
      <div v-else class="grid gap-3 mb-8">
        <article
          v-for="item in items"
          :key="item.id"
          class="card bg-base-200 shadow-sm"
        >
          <div class="card-body p-4">
            <p class="text-sm whitespace-pre-wrap break-words">{{ item.message }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-3 text-xs opacity-70">
              <span v-if="item.meta?.displayName" class="font-semibold">— {{ item.meta.displayName }}</span>
              <span v-else class="italic">— anonymous farmer</span>
              <span>·</span>
              <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
              <span v-if="item.status === 'resolved'" class="badge badge-success badge-xs">resolved</span>
            </div>
          </div>
        </article>
      </div>
    </template>

    <h2 class="text-lg font-semibold mt-8 mb-3">Featured screenshots</h2>
    <div class="flex flex-wrap justify-center gap-4">
      <div
        v-for="(src, i) in imageUrls"
        :key="i"
        class="rounded shadow overflow-hidden"
      >
        <div class="flex justify-center items-center">
          <img
            :src="getImageSrc(src).value"
            :alt="`Feedback ${i + 1}`"
            class="max-w-[800px] max-h-[800px] w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { getIssuesEndpoint, listPublicFeedback } from '@/services/projectmateService.js'

// Legacy static screenshots (curated)
const { getImageSrc } = useReliableAssets()
const imageModules = import.meta.glob('@/assets/feedbacks/*.{webp,jpg,png}', {
  eager: true,
  as: 'url',
})
const imageUrls = Object.entries(imageModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([_, url]) => url)

// Live public wall
const items = ref([])
const loading = ref(true)
const error = ref('')
const configured = ref(!!getIssuesEndpoint())

function formatDate (iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso || ''
  }
}

onMounted(async () => {
  if (!configured.value) {
    loading.value = false
    return
  }
  try {
    items.value = await listPublicFeedback()
  } catch (err) {
    error.value = err.message || 'Could not load feedback.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.05);
}
</style>
