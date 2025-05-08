<!-- src/components/Grid.vue -->
<script setup>
import { useRoute } from 'vue-router'
import { useGridStore } from '@/composables/useGridStore'

const route = useRoute()
const landId    = route.params.landId
const gridStore = useGridStore(landId)
const { tiles, cycleHintAt } = gridStore

function getTileImage(tile) {
  const match = tile.find(cls => cls.startsWith('tileImage:'))
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}

// Debug log: now tiles is always an Array
// watch(
//   tiles,
//   t => console.log('🟢 Tiles now:', t.slice(0,50)),
//   { immediate: true }
// )
</script>

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
          v-if="getTileImage(tile)"
          :src="getTileImage(tile)"
          :alt="getTileImage(tile)"
          class="tile-img"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* your .grid, .tile, .tile-img styles */
</style>
