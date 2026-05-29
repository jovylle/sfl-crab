<template>
  <div class="contain-please relative mx-auto w-full max-w-[min(100%,420px)]">
    <div class="overlay-cols text-[0.45rem] sm:text-[0.5rem] lg:text-xs">
      <div
        v-for="L in colLabels"
        :key="L"
        class="overlay-cell justify-center items-end"
      >
        {{ L }}
      </div>
    </div>

    <div
      class="overlay-rows text-base-content text-[0.45rem] sm:text-[0.5rem] lg:text-xs"
    >
      <div
        v-for="N in rowLabels"
        :key="N"
        class="overlay-cell justify-end items-center"
      >
        {{ N }}
      </div>
    </div>

    <div class="grid w-full p-0.5 gap-0.5 bg-base-300 dark:bg-slate-500">
      <div
        v-for="(tile, index) in cells"
        :key="index"
        class="tile w-full flex items-center bg-base-100 justify-center aspect-square relative pointer-events-none"
        :class="normalizeTile(tile)"
      >
        <img
          v-if="getTileImage(normalizeTile(tile))"
          :src="getImageSrc(getTileImage(normalizeTile(tile))).value"
          alt=""
          class="tile-img"
        />

        <span
          v-if="getTileLabelMark(tile)"
          class="hint-label-digit"
        >
          {{ getTileLabelMark(tile) }}
        </span>

        <span
          v-if="showTreasureOrder && treasureOrderMap[index]"
          class="absolute top-0 right-0
            w-full h-full
            transform origin-top-right scale-[0.33333]
            flex items-center justify-center
            bg-base-200 rounded-full shadow
            text-2xl md:text-3xl p-1 font-bold
            pointer-events-none overflow-hidden"
        >
          {{ treasureOrderMap[index] }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { getLabelFromTile } from '@/utils/hintLabel.js'

defineProps({
  cells: { type: Array, default: () => [] },
  treasureOrderMap: { type: Array, default: () => [] },
  showTreasureOrder: { type: Boolean, default: true },
})

const { getImageSrc } = useReliableAssets()

const colLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i))
)
const rowLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) => i + 1)
)

function getTileImage (tile) {
  if (!Array.isArray(tile)) return null
  const match = tile.find(
    (cls) => typeof cls === 'string' && cls.includes('tileImage:')
  )
  if (!match) return null
  const slug = match.split(':')[1]
  return `/world/${slug}.webp`
}

function normalizeTile (tile) {
  if (Array.isArray(tile)) return tile
  return String(tile).split(' ')
}

function getTileLabelMark (tile) {
  return getLabelFromTile(normalizeTile(tile))
}
</script>

<style scoped>
/* Inset axis labels so GIF export (html-to-image) does not clip overflow. */
.contain-please {
  position: relative;
  --label-size: 1.25rem;
  padding-top: var(--label-size);
  padding-left: var(--label-size);
  box-sizing: border-box;
}

.overlay-cols {
  position: absolute;
  top: 0;
  left: var(--label-size);
  right: 0;
  height: var(--label-size);
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  pointer-events: none;
}

.overlay-rows {
  position: absolute;
  top: var(--label-size);
  left: 0;
  width: var(--label-size);
  bottom: 0;
  display: grid;
  grid-template-rows: repeat(10, 1fr);
  pointer-events: none;
}

.overlay-cell {
  display: flex;
  user-select: none;
}

.tile {
  position: relative;
}
</style>
