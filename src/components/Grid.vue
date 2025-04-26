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
import { onMounted, watch } from 'vue'
import { useGrid } from '../composables/useGrid'
import { gridStore } from '@/composables/gridStore'

const { tiles, loadFromLocalStorage, cycleHintAt } = gridStore

// WATCH TILES:
watch(tiles, (newTiles, oldTiles) => {
  console.log('GRID Tiles updated!')
  console.log('New Tiles:', newTiles)
  console.log('Old Tiles:', oldTiles)
  console.log('tiles Tiles:', tiles)
})
onMounted(() => {
  loadFromLocalStorage()
})
</script>
