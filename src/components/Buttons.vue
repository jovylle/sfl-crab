<template>
  <div>
    <button @click="$emit('clear')">Change Land ID</button>
        <button
          @click="$emit('refresh')"
          :disabled="isRefreshing"
        >
          {{ isRefreshing ? `Refreshing... (${refreshCountdown})` : 'Refresh Data From Server' }}
        </button>
  </div>
</template>

<script setup>
const props = defineProps(['isRefreshing', 'refreshCountdown'])
const emit = defineEmits(['clear', 'refresh'])
</script>