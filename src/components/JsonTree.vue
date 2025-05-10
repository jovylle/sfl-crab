<template>
  <ul class="space-y-1 overflow-hidden">
    <li
      v-for="(value, key) in data"
      :key="key"
      :class="[
        'pl-2',
        { 'inline-block': !isObject(value) }
      ]"
    >
      <template v-if="isObject(value)">
        <div
          class="cursor-pointer select-none flex items-center"
          @click="toggle(key)"
        >
          <span class="mr-1">
            <svg
              v-if="!open[key]"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </span>
          <strong>{{ key }}:</strong>
          <!-- <span class="italic text-gray-500">({{ typeOf(value) }})</span> -->
        </div>
        <transition name="fade">
          <JsonTree
            v-if="open[key]"
            :data="value"
            :level="level + 1"
            :maxCollapsedDepth="maxCollapsedDepth"
          />
        </transition>
      </template>
      <template v-else>
        <div class="">
          <span class="text-purple-700">{{ key }}:</span>
          <span class="text-gray-800">{{ value }}</span>
        </div>
      </template>
    </li>
  </ul>
</template>

<script setup>
import { reactive, watch, toRefs } from 'vue'

const props = defineProps({
  data: { type: [Object, Array], required: true },
  level: { type: Number, default: 1 },
  maxCollapsedDepth: { type: Number, default: 3 },
})

const open = reactive({})

// initialize open/closed state
const initOpen = () => {
  Object.keys(props.data).forEach((k) => {
    open[k] = props.level < props.maxCollapsedDepth
  })
}

// whenever data changes (or on mount), re-init
watch(() => props.data, initOpen, { immediate: true })

const isObject = (v) =>
  v !== null && typeof v === 'object'

const typeOf = (v) =>
  Array.isArray(v) ? 'Array' : typeof v

function toggle(key) {
  open[key] = !open[key]
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  height: 0;
}
</style>
