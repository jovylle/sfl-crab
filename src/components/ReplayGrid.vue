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
        :class="tileClasses(tile, index)"
      >
        <img
          v-if="getTileImage(normalizeTile(tile))"
          :src="getImageSrc(getTileImage(normalizeTile(tile))).value"
          alt=""
          class="tile-img"
        />

        <!-- Prediction: the guaranteed treasure's actual image -->
        <img
          v-else-if="predictionSlug(index)"
          :src="getImageSrc('/world/' + predictionSlug(index) + '.webp').value"
          class="tile-img prediction-img"
          alt="predicted treasure"
        />

        <!-- Prediction: guaranteed treasure, exact type unknown -->
        <span
          v-else-if="predictionUnknown(index)"
          class="prediction-unknown"
          title="Guaranteed treasure — exact type unknown"
        >?</span>

        <!-- transient shovel dig reveal for tiles dug at the current step.
             Kept outside the tile-img/prediction v-if chain; absolute overlay. -->
        <img
          v-if="justRevealed.has(index) && !exportShovel"
          :key="`shovel-${index}`"
          class="tile-shovel"
          :src="shovelSrc"
          alt=""
        />
        <!-- GIF export: deterministic, statically-capturable shovel frame -->
        <img
          v-else-if="justRevealed.has(index) && exportShovel && shovelProgress >= 0"
          class="tile-shovel-static"
          :src="shovelSrc"
          :style="shovelStyle"
          alt=""
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
import { computed, toRef } from 'vue'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { usePredictionEngine } from '@/composables/usePredictionEngine.js'
import { getLabelFromTile } from '@/utils/hintLabel.js'
import { isRevealed } from '@/utils/tileState.js'

const props = defineProps({
  cells: { type: Array, default: () => [] },
  treasureOrderMap: { type: Array, default: () => [] },
  showTreasureOrder: { type: Boolean, default: true },
  showPrediction: { type: Boolean, default: false },
  patternKeys: { type: Array, default: () => [] },
  // Indices (a Set) revealed exactly at the current replay step → shovel anim.
  justRevealed: { type: Object, default: () => new Set() },
  // When true, prediction solves run synchronously (used during GIF export so
  // the final captured frame already has its predictions).
  eagerPrediction: { type: Boolean, default: false },
  // Phase 3 GIF bake: when true, drive the shovel from `shovelProgress` (a
  // static, snapshot-capturable transform) instead of the CSS keyframe.
  exportShovel: { type: Boolean, default: false },
  // 0..1 progress of the baked shovel dig; < 0 hides it (settled frame).
  shovelProgress: { type: Number, default: -1 },
})

const { getImageSrc } = useReliableAssets()

// ── Prediction engine ──
// props.cells is already the class-token array format solveTreasures consumes,
// so no adapter is needed. Recomputes per replay step via the deep watch inside.
const { guaranteed, guaranteedSlugs } = usePredictionEngine(
  toRef(props, 'cells'),
  toRef(props, 'patternKeys'),
  toRef(props, 'showPrediction'),
  { syncRef: toRef(props, 'eagerPrediction') },
)

const shovelSrc = computed(() => getImageSrc('/images/sand-shovel.png').value)

// Baked-GIF shovel pose from a 0..1 progress, mirroring @keyframes shovel-dig:
// the shovel bobs up mid-dig, sweeps slightly, and fades out at the end.
const shovelStyle = computed(() => {
  const p = Math.min(1, Math.max(0, props.shovelProgress))
  const lift = Math.sin(p * Math.PI)          // 0 → 1 → 0
  const y = -18 * lift                        // bob upward (%)
  const rot = -10 + 20 * p                    // sweep left → right
  const scale = 0.75 + 0.3 * lift
  const opacity = p >= 1 ? 0 : Math.min(1, lift + 0.35)
  return {
    transform: `translate(-50%, -50%) translateY(${y}%) rotate(${rot}deg) scale(${scale})`,
    opacity: String(opacity),
  }
})

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

// Class list for a cell. A guaranteed prediction takes priority over speculative
// hint marks so the guaranteed green reads cleanly (mirrors Grid.vue).
function tileClasses (tile, index) {
  if (props.showPrediction && guaranteed.value.has(index) && !isRevealed(tile)) {
    return ['predicted-guaranteed']
  }
  return normalizeTile(tile)
}

// The predicted treasure slug for a cell, iff prediction is on, the cell is
// guaranteed + unambiguous, and it isn't already revealed.
function predictionSlug (index) {
  if (!props.showPrediction) return null
  if (!guaranteed.value.has(index)) return null
  if (isRevealed(props.cells[index])) return null
  return guaranteedSlugs.value.get(index) ?? null
}

// True when a cell is a guaranteed treasure but its exact type is ambiguous.
function predictionUnknown (index) {
  if (!props.showPrediction) return false
  if (!guaranteed.value.has(index)) return false
  if (isRevealed(props.cells[index])) return false
  return !guaranteedSlugs.value.has(index)
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
