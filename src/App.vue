<template>
  <div class="p-4 max-w-screen-md mx-auto">
    <h1 style="font-size:1.25rem; font-weight:bold; margin-bottom:1rem">
      SFL Digging Assistant
    </h1>

    <div class="grid">
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        @click="toggleTile(index)"
        :class="['tile', tile]"
      >
        <img
          v-if="tile === 'sand'"
          :src="SandImg"
          alt="sand"
          class="tile-img"
        />
        <img
          v-if="tile === 'crab'"
          :src="CrabImg"
          alt="crab"
          class="tile-img"
        />
      </div>
    </div>

    <button
      style="margin-top:1rem; padding:0.5rem 1rem; background:#ef4444; color:#fff; border:none; border-radius:0.25rem"
      @click="resetGrid"
    >
      Reset
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SandImg from './assets/images/Sand.png'
import CrabImg from './assets/images/Crab.png'

const gridSize = 10
const tiles = ref(Array(gridSize * gridSize).fill('empty'))

const indexToCoord = i => [Math.floor(i / gridSize), i % gridSize]
const coordToIndex = (x, y) => x * gridSize + y

function toggleTile(idx) {
  const cur = tiles.value[idx]
  const next = cur === 'empty'
    ? 'sand'
    : cur === 'sand'
    ? 'crab'
    : cur === 'crab'
    ? 'treasure'
    : 'empty'
  tiles.value[idx] = next
  recomputeHighlights()
}

function recomputeHighlights() {
  // clear old auto‑marks
  tiles.value = tiles.value.map(t =>
    (t === 'safe' || t === 'risky') ? 'empty' : t
  )
  // reapply for sand/crab only
  tiles.value.forEach((t, idx) => {
    if (t === 'sand' || t === 'crab') {
      highlightNeighbors(idx, t)
    }
  })
}

function highlightNeighbors(idx, type) {
  const [x, y] = indexToCoord(idx)
  const deltas = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ]
  deltas.forEach(([dx, dy]) => {
    const nx = x + dx, ny = y + dy
    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
      const j = coordToIndex(nx, ny)
      if (tiles.value[j] === 'empty') {
        tiles.value[j] = type === 'sand' ? 'safe' : 'risky'
      }
    }
  })
}

function resetGrid() {
  tiles.value = Array(gridSize * gridSize).fill('empty')
}
</script>

<style>
.grid {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(10, 2rem);
}
.tile {
  width: 2rem;
  aspect-ratio: 1;
  border: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  background-color: white;
}
.tile.sand     { background-color: #fef3c7; }
.tile.crab     { background-color: #f87171; }
.tile.safe     { background-color: #d1d5db; }
.tile.risky    { background-color: #fb923c; }
.tile.treasure { background-color: #4ade80; }

.tile-img {
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
}
</style>
