<template>
  <div class="dropdown dropdown-top dropdown-center flex w-full">
    <div tabindex="0" role="button" class="btn ml-auto btn-accent">
      Theme
    </div>
    <ul
      tabindex="0"
      class="dropdown-content bg-base-300 rounded-box z-1 w-52 p-2 shadow-2xl"
    >
      <li v-for="theme in themes" :key="theme.value">
        <input
          type="radio"
          name="theme-dropdown"
          class="theme-controller w-full btn btn-sm btn-block btn-ghost justify-start"
          :aria-label="theme.label"
          :value="theme.value"
          :checked="currentTheme === theme.value"
          @change="setTheme(theme.value)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentTheme = ref('default')

const themes = [
  { label: 'Default', value: 'default' },
  { label: 'Retro', value: 'retro' },
  { label: 'Garden', value: 'garden' },
  { label: 'Dark', value: 'dim' },
]

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'default'
  currentTheme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)
})

function setTheme(theme) {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}
</script>
