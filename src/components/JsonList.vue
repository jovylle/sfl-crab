<!-- src/components/JsonList.vue -->
<template>
  <div class="mb-6">
    <h3 class="text-2xl font-semibold mb-2">{{ title }}</h3>
    <ul class="list-none p-0">
      <li
        v-for="(value, key, idx) in data"
        :key="key"
        class="flex justify-between px-4 py-2
               odd:bg-base-200 even:bg-base-100"
      >
        <span class="font-medium break-words">{{ key }}</span>
        <span class="ml-4 whitespace-nowrap">{{ value }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, required: true },
  data:  { type: [Object, Array], required: true }
})
</script>

<style scoped>
/* No extra CSS—Tailwind handle zebra striping */
</style>
