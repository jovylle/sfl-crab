<!-- src/components/HintPicker.vue -->
<template>
  <div
    v-if="visible"
    class="dropdown dropdown-open"
    :style="popoverStyle"
    @click.stop
  >
    <button class="btn btn-ghost p-0 w-0 h-0" ref="anchor" />

    <ul
      class="dropdown-content !grid !grid-cols-3 !grid-rows-2 gap-0.5 p-0.5
             bg-base-100 border border-base-300"
      style="min-width: 12rem;"
    >
      <li
        v-for="(hintClass, idx) in hints"
        :key="hintClass + idx"
        class="aspect-square flex items-center justify-center
               border-base-300 border rounded"
        @click="selectHint(idx)"
      >
        <div :class="['tile', hintClass, 'm-2', 'w-full', 'h-full']" />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 1️⃣ Define your props
const props = defineProps({
  hints:     { type: Array, required: true },   // e.g. ['hint-sand','hint-crab',…]
  x:         { type: Number, required: true },
  y:         { type: Number, required: true },
  tileIndex: { type: Number, required: true }
})

// 2️⃣ Define the emit
const emit = defineEmits(['pick'])

const visible = ref(true)

const popoverStyle = computed(() => ({
  position:  'absolute',
  top:       `${props.y -50}px`,
  left:      `${props.x - 95.5}px`,
  transform: 'translate(-50%, -50%)',
  zIndex:    50
}))

// 3️⃣ Emit the chosen class, not the index
function selectHint(idx) {
  const chosenClass = props.hints[idx]
  emit('pick', { tileIndex: props.tileIndex, hint: chosenClass })
  visible.value = false
}
</script>
