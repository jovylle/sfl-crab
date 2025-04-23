<template>
  <div>
    <button @click="$emit('clear')">Change Land ID</button>
    <button :disabled="isRefreshing" @click="$emit('refresh')">
      Refresh Data From Server
      <span v-if="isRefreshing">({{ refreshCountdown }}s)</span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps(['isRefreshing', 'refreshCountdown'])
const emit = defineEmits(['clear', 'refresh'])
</script>