<script setup>
import { watch } from 'vue'

import { inject } from 'vue'

const gridStore = inject('gridStore')

const { tiles, cycleHintAt } = gridStore

function getTileImage(tile) {
  const match = tile.find(cls => cls.startsWith('tileImage:'))
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}

watch(
  () => tiles.value.map(t => t.join(',')),
  newVal => {
    console.log('🟢 Tiles now:', newVal.slice(0,10), '…') // log first 10 for brevity
  }
)
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