<template>
  <div class="container">
    <header class="site-header">
      <h1>SFL Digging Assistant V1.1</h1>
    </header>

    <main class="site-main">
      <p class="instructions">
        <strong>Click sequence:</strong>
        <span class="sand-label">sand (yellow)</span> →
        <span class="crab-label">crab (red)</span> →
        <span class="treasure-label">treasure (green)</span>
      </p>

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

      <button class="reset" @click="resetGrid">Reset</button>
    </main>

    <footer class="site-footer">
      <p>
        &copy; 2025 - Tool by Community for Community -
        <a
          href="https://github.com/jovylle"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
        >
          git
        </a>
      </p>
    </footer>
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
  const next =
    cur === 'empty'     ? 'sand'
  : cur === 'sand'      ? 'crab'
  : cur === 'crab'      ? 'treasure'
  :                       'empty'
  tiles.value[idx] = next
  recomputeHighlights()
}

function recomputeHighlights() {
  tiles.value = tiles.value.map(t =>
    (t === 'safe' || t === 'risky') ? 'empty' : t
  )
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
    if (
      nx >= 0 && nx < gridSize &&
      ny >= 0 && ny < gridSize
    ) {
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
/* Container & layout */
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: sans-serif;
  margin: 0;
}
.site-header,
.site-footer {
  background: #333;
  color: #fff;
  text-align: center;
  padding: 1rem;
}
.site-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Instructions */
.instructions {
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
}
.sand-label     { color: #fef3c7; font-weight: bold; }
.crab-label     { color: #f87171; font-weight: bold; }
.treasure-label { color: #4ade80; font-weight: bold; }

/* Grid & tiles */
.grid {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(10, 2rem);
  margin-bottom: 1rem;
}
.tile {
  width: 2rem;
  aspect-ratio: 1;
  border: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  background: white;
}
.tile.sand     { background: #fef3c7; }
.tile.crab     { background: #f87171; }
.tile.safe     { background: #d1d5db; }
.tile.risky    { background: #fb923c; }
.tile.treasure { background: #4ade80; }
.tile-img {
  width: 1rem;
  height: 1rem;
  object-fit: contain;
}

/* Reset button */
.reset {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}
.reset:hover {
  background: #dc2626;
}
</style>
