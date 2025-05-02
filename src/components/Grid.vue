<script setup>
import { watch } from 'vue'

import { inject } from 'vue'

const gridStore = inject('gridStore')

const { tiles, cycleHintAt } = gridStore


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