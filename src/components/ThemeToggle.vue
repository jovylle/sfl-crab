<template>
  <div class="flex justify-end w-full px-4 pt-4">
    <label class="cursor-pointer label">
      <span class="label-text mr-2">Theme</span>
      <input
        type="checkbox"
        class="toggle theme-controller"
        :checked="isDark"
        @change="toggleTheme"
      />
    </label>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isDark = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('theme') || 'lightsoft'
  isDark.value = saved === 'darkdim'
  document.documentElement.setAttribute('data-theme', saved)
})

function toggleTheme() {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'darkdim' : 'lightsoft'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}
</script>
