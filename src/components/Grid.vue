<template>
  <div class="contain-please">
    <div class="grid">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile"
        :class="tile"
        @click="cycleHintAt(index)"
      >
        <img
          v-if="tile.includes('crab')"
          src="@/assets/images/crab.png"
          alt="Crab"
          class="tile-img"
        />
        <img
          v-else-if="tile.includes('sand')"
          src="@/assets/images/sand.png"
          alt="Sand"
          class="tile-img"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGrid } from '../composables/useGrid'
const { updateGridFromData } = useGrid()


const { tiles, loadFromLocalStorage, cycleHintAt } = useGrid()

onMounted(() => {
  loadFromLocalStorage()
})
</script>
