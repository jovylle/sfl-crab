<!-- src/components/KeyValueList.vue -->
<template>
  <ul class="list-none p-0">
    <li
      v-for="(value, key, idx) in data"
      :key="key"
      :class="[
        'px-4 py-2',
        idx % 2 === 0 ? 'bg-base-200' : 'bg-base-100',
        `pl-${level * 4}`
      ]"
    >
      <div class="flex justify-between items-start">
        <span class="font-medium break-words">{{ key }}</span>
        <!-- Primitive -->
        <span v-if="!isObject(value)" class="ml-4 whitespace-nowrap">
          {{ value }}
        </span>
      </div>

      <!-- Recurse for nested object/array -->
      <KeyValueList
        v-if="isObject(value)"
        :data="value"
        :level="level + 1"
      />
    </li>
  </ul>
</template>

<script setup>
import { defineProps } from 'vue'
import KeyValueList from './KeyValueList.vue'

const props = defineProps({
  data:  { type: [Object, Array], required: true },
  level: { type: Number, default: 0 }
})

const isObject = (v) => v !== null && typeof v === 'object'
</script>

<style scoped>
/* Tailwind’s pl-{n} classes accept only fixed values (e.g. pl-4, pl-8).
   If you need arbitrary, use inline style or a custom class. */
</style>
