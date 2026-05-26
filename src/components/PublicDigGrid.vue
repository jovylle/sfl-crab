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

    <div class="overlay-rows text-base-content text-[0.45rem] sm:text-[0.5rem] lg:text-xs">
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
          :src="getTileImageSrc(normalizeTile(tile))"
          alt=""
          class="tile-img"
          @error="onImgError"
        />

        <span
          v-if="showTreasureOrder && treasureOrderMap[index]"
          class="absolute top-0 right-0
            min-w-[1.1em] h-[1.1em] px-[0.15em]
            flex items-center justify-center
            bg-base-200/90 rounded-sm shadow-sm
            text-[0.55em] font-bold leading-none
            pointer-events-none"
        >
          {{ treasureOrderMap[index] }}
        </span>

        <span
          v-if="showItemLabels && cellItems[index]?.name"
          class="absolute bottom-0 left-0 right-0
            text-[0.4rem] sm:text-[0.45rem]
            text-center leading-none px-0.5 py-0.5
            bg-base-100/80 truncate pointer-events-none"
        >
          {{ cellItems[index].name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { worldAssetGithubUrl } from '@/utils/worldAssets.js'

const props = defineProps({
  cells: { type: Array, default: () => [] },
  treasureOrderMap: { type: Array, default: () => [] },
  cellItems: { type: Array, default: () => [] },
  showTreasureOrder: { type: Boolean, default: true },
  showItemLabels: { type: Boolean, default: false },
})

const colLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i))
)
const rowLabels = computed(() =>
  Array.from({ length: 10 }, (_, i) => i + 1)
)

function normalizeTile (tile) {
  if (Array.isArray(tile)) return tile
  return String(tile).split(' ')
}

function getTileImage (tile) {
  if (!Array.isArray(tile)) return null
  const match = tile.find(cls => typeof cls === 'string' && cls.includes('tileImage:'))
  if (!match) return null
  return match.split(':')[1]
}

function getTileImageSrc (tile) {
  const slug = getTileImage(tile)
  if (!slug) return ''
  return `/world/${slug}.webp`
}

function onImgError (e) {
  const img = e.target
  const src = img.src || ''
  if (src.includes('raw.githubusercontent.com')) return
  const slugMatch = src.match(/\/world\/([^/]+)\.webp$/)
  if (slugMatch) {
    img.src = worldAssetGithubUrl(slugMatch[1])
  }
}
</script>

<style scoped>
.contain-please {
  position: relative;
  --label-size: 10%;
  padding-top: 0;
  padding-left: 0;
}

.overlay-cols {
  position: absolute;
  top: calc(var(--label-size) * -1 + 1px);
  left: 0;
  width: 100%;
  height: var(--label-size);
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  pointer-events: none;
}

.overlay-rows {
  position: absolute;
  top: 0;
  left: calc(var(--label-size) * -1 - 2px);
  width: var(--label-size);
  height: 100%;
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
  font-size: clamp(6px, 2.8vw, 28px);
}

.tile-img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.grid {
  grid-template-columns: repeat(10, 1fr);
}
</style>
