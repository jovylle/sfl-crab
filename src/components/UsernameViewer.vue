<template>
  <div v-if="username" class="mt-6 text-center">
    <h2 class="text-xl font-bold text-gray-800">
      👤 Welcome, {{ username }}!
    </h2>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const username = ref('')

onMounted(() => {
  const saved = localStorage.getItem('landData')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      username.value = data?.state?.username || ''
    } catch (e) {
      console.error('Invalid landData for username', e)
    }
  }
})
</script>

<style scoped>
/* Optional small styles */
</style>
