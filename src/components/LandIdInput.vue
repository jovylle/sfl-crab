<!-- filepath: /Users/jovylle.bermudez/fore/lab/sfl-crab/src/components/LandIdInput.vue -->

<template>
  <div>
    <input
      v-model="input"
      placeholder="Enter Land ID"
      class="land-id-input"
    />
    <button @click="submit">Submit</button>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps(['errorMessage'])
const emit = defineEmits(['submit'])
const input = ref('')

function submit() {
  if (input.value) {
    emit('submit', input.value)
  }
}
</script>