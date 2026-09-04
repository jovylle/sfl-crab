<!-- src/views/FeedbackGallery.vue -->
<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">User Feedback Screenshots</h1>
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
import { useReliableAssets } from '@/composables/useReliableAssets.js'

// Use reliable assets composable
const { getImageSrc } = useReliableAssets()

// auto-import image URLs
const imageModules = import.meta.glob('@/assets/feedbacks/*.{webp,jpg,png}', {
  eager: true,
  as: 'url'
})

// Convert to array and sort by filename (optional)
const imageUrls = Object.entries(imageModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([_, url]) => url)
</script>

<style scoped>
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.05);
}
</style>
