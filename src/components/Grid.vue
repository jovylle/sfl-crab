<script setup>
import { useRoute }       from 'vue-router'
import { useGridManager }  from '@/composables/useGridManager'

const route   = useRoute()
const landId  = route.params.landId || '0' // default to guest key
const grid    = useGridManager(landId)

// convenience
const tiles       = grid.tiles
const cycleHint   = grid.cycle
</script>

<template>
  <div class="contain-please">
    <div class="grid">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile"
        :class="tile"
        @click="cycleHint(index)"
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

<script>
// still inside the same file, below your setup
function getTileImage(tile) {
  if (!Array.isArray(tile)) return null
  const match = tile.find(cls => cls.startsWith('tileImage:'))
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}
</script>

<style scoped>
/* your existing styles */
</style>
