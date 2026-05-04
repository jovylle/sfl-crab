<template>
  <div class="contain-please relative mt-1 sm:mt-4 mx-auto" @contextmenu.prevent.stop>
    <!-- COL LABELS OVERLAY -->
    <div class="overlay-cols text-[0.45rem] sm:text-[0.5rem] lg:text-xs">
      <div v-for="L in colLabels" :key="L" class="overlay-cell justify-center items-end">{{ L }}</div>
    </div>

    <!-- ROW LABELS OVERLAY -->
    <div class="overlay-rows text-base-content text-[0.45rem] sm:text-[0.5rem] lg:text-xs">
      <div v-for="N in rowLabels" :key="N" class="overlay-cell justify-end items-center">{{ N }}</div>
    </div>

    <div
      class="relative z-20 grid w-full p-0.5 gap-0.5 bg-base-300 dark:bg-slate-500"
      :class="{ 'pointer-events-none select-none': loading }"
    >
      <div
        v-for="(tile, index) in tiles"
        :key="index"
        class="tile w-full aspect-square relative flex items-center justify-center"
        :class="outerClasses(tile, index)"
        @click="onLeftClick($event, index)"
        @contextmenu.prevent="onRightClick($event, index)"
      >
        <!-- Inner layer: shakes during dig so the cell border stays stable -->
        <div
          class="absolute inset-0 flex items-center justify-center"
          :class="{ 'practice-digging-anim': diggingSet.has(index) }"
        >
          <!-- Revealed / ghosted image -->
          <img
            v-if="tile && getSlug(tile) && getSlug(tile) !== 'crab'"
            :src="getImageSrc(getImagePath(tile)).value"
            :alt="tile.type"
            class="tile-img"
            :class="{ '': tile.ghosted }"
          />
          <Icon
            v-else-if="tile && getSlug(tile) === 'crab'"
            icon="noto:crab"
            class="tile-icon"
            :class="{ '': tile.ghosted }"
          />

          <!-- Hint image (tileImage: class from engine) -->
          <img
            v-else-if="!tile && getHintSlug(index) && getHintSlug(index) !== 'crab'"
            :src="getImageSrc(getHintImagePath(index)).value"
            alt="hint"
            class="tile-img"
          />
          <Icon
            v-else-if="!tile && getHintSlug(index) === 'crab'"
            icon="noto:crab"
            class="tile-icon"
          />

          <!-- Confirm-dig: pulsing check waiting for second click -->
          <span v-if="confirmIndex === index" class="confirm-dig-wrap">
            <Icon icon="mdi:check-circle" class="confirm-check-icon" />
          </span>

          <!-- Digging animation: shovel striking the ground -->
          <span v-else-if="diggingSet.has(index)" class="digging-shovel-wrap">
            <Icon icon="noto:shovel" class="digging-shovel-icon" />
          </span>

          <!-- Idle hover hint -->
          <span
            v-else-if="!tile && !gameOver && !hasHint(index) && !getAutoMarker(index)"
            class="hover-shovel-wrap"
          >
            <Icon icon="noto:shovel" class="hover-shovel-icon" />
          </span>

          <!-- Auto indicator: low-priority full-cell hint derived from revealed sand / crab -->
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="absolute inset-0 z-30 flex items-center justify-center rounded-box bg-base-100/70 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3 text-center px-4">
        <span class="loading loading-dots loading-lg text-primary"></span>
        <div class="text-sm font-semibold">Loading today's round</div>
        <div class="text-xs text-base-content/60">Rebuilding the grid from the shared pattern set</div>
      </div>
    </div>

    <!-- Backdrop: closes picker or cancels confirm -->
    <div
      v-if="picker || confirmIndex !== null"
      class="fixed inset-0 z-10"
      @click="picker = null; cancelConfirm()"
      @contextmenu.prevent
    ></div>

    <!-- HintPicker on right-click — mark only, no dig option here -->
    <HintPicker
      v-if="picker"
      :tileIndex="picker.tileIndex"
      :x="picker.x"
      :y="picker.y"
      :hints="MARK_HINTS"
      :possibleTreasures="[]"
      @pick="onHintPicked"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { useGridEngine } from '@/composables/useGridEngine.js'
import HintPicker from '@/components/HintPicker.vue'

const { getImageSrc } = useReliableAssets()
const engine = useGridEngine(10)

const props = defineProps({
  tiles:    { type: Array,   required: true },
  hiddenGrid: { type: Array, default: () => [] },
  gameOver: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['dig', 'auto-finish'])

const colLabels = computed(() => Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)))
const rowLabels = computed(() => Array.from({ length: 10 }, (_, i) => i + 1))
const adjacentOffsets = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
]

const sandAutoSet = computed(() => collectAutoMarkers('sand'))
const crabAutoSet = computed(() => collectAutoMarkers('crab'))
const shouldAutoFinish = computed(() => {
  if (!props.hiddenGrid?.length) return false

  return props.hiddenGrid.every((hiddenTile, index) => {
    if (hiddenTile?.type !== 'treasure') return true

    const tile = props.tiles[index]
    if (tile?.revealed || tile?.ghosted) return true
    return hasTreasureHint(index)
  })
})

watch(shouldAutoFinish, done => {
  if (done && !props.gameOver) {
    emit('auto-finish')
  }
}, { immediate: true })

// Marking hints only — dig is now left-click, not a picker option
const MARK_HINTS = [
  'hint-red-dot',
  'hint-potential-treasure',
  'hint-potential-treasure2',
  'hint-sand tileImage:sand',
  'hint-treasure',
  'hint-crab tileImage:crab',
  'hint-nothing',
  'no-hint-and-show-trash-icon',
  'hint-crab-eyes-maybe',
]

// ── Dig animation state ──────────────────────────────────────────────
const diggingSet    = ref(new Set())
const pendingTimers = {}
const DIG_DELAY_MS  = 350

function startDig(index) {
  if (diggingSet.value.has(index)) return
  confirmIndex.value = null
  diggingSet.value = new Set([...diggingSet.value, index])
  pendingTimers[index] = setTimeout(() => {
    emit('dig', index)
    diggingSet.value = new Set([...diggingSet.value].filter(i => i !== index))
    delete pendingTimers[index]
  }, DIG_DELAY_MS)
}

onUnmounted(() => Object.values(pendingTimers).forEach(clearTimeout))

// ── Confirm-dig state (left click → confirm → left click again → dig) ──
const confirmIndex = ref(null)

function cancelConfirm() {
  confirmIndex.value = null
}

// ── LEFT CLICK: primary action = dig ────────────────────────────────
function onLeftClick(event, index) {
  const tile = props.tiles[index]
  if (props.gameOver || tile?.revealed || tile?.ghosted || diggingSet.value.has(index)) return

  if (picker.value) {
    picker.value = null
    return
  }

  if (confirmIndex.value === index) {
    // Second click on confirming tile → dig
    startDig(index)
  } else {
    // First click → enter confirm state
    confirmIndex.value = index
  }
}

// ── RIGHT CLICK: secondary action = open hint marker ────────────────
const picker = ref(null)

function onRightClick(event, index) {
  const tile = props.tiles[index]
  if (props.gameOver || tile?.revealed || tile?.ghosted || diggingSet.value.has(index)) return

  event.preventDefault()
  confirmIndex.value = null

  const container = event.currentTarget.closest('.contain-please')
  const cR = container.getBoundingClientRect()
  const tR = event.currentTarget.getBoundingClientRect()
  picker.value = {
    tileIndex: index,
    x: tR.left - cR.left + tR.width  / 2,
    y: tR.top  - cR.top  + tR.height / 2,
  }
}
function onHintPicked({ tileIndex, hint }) {
  picker.value = null
  if (hint === 'no-hint-and-show-trash-icon') {
    engine.pickEngineHint(tileIndex, null)
  } else {
    engine.pickEngineHint(tileIndex, hint)
  }
}

// ── Tile display helpers ─────────────────────────────────────────────
function hasHint(index) {
  return engine.tiles.value[index]?.some(c => c.startsWith('hint-') || c.startsWith('near-'))
}

function hasTreasureHint(index) {
  return engine.tiles.value[index]?.some(c => c.startsWith('hint-treasure'))
}

function getHintSlug(index) {
  const classes = engine.tiles.value[index]
  if (!classes) return null
  const m = classes.find(c => typeof c === 'string' && c.includes('tileImage:'))
  return m ? m.split(':')[1] : null
}

function getHintImagePath(index) {
  const slug = getHintSlug(index)
  if (!slug) return null
  return slug === 'sand'
    ? '/my_images/sand.png'
    : `/world/${slug}.webp`
}

function getSlug(tile) {
  if (!tile) return null
  if (tile.type === 'crab') return 'crab'
  if (tile.type === 'sand') return 'sand'
  if (tile.type === 'treasure' && tile.name) return tile.name.toLowerCase().replace(/\s+/g, '_')
  return null
}

function getImagePath(tile) {
  const slug = getSlug(tile)
  if (!slug) return null
  return slug === 'sand'
    ? '/my_images/sand.png'
    : `/world/${slug}.webp`
}

function hasAdjacentTreasure(index) {
  const x = index % 10
  const y = Math.floor(index / 10)

  return adjacentOffsets.some(({ dx, dy }) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) return false

    const neighbor = props.tiles[ny * 10 + nx]
    return neighbor?.type === 'treasure'
  })
}

function collectAutoMarkers(type) {
  const marked = new Set()

  props.tiles.forEach((tile, index) => {
    if (!tile || tile.type !== type || !tile.revealed) return
    if (type === 'crab' && hasAdjacentTreasure(index)) return
    if (
      type === 'crab' &&
      adjacentOffsets.some(({ dx, dy }) => {
        const x = index % 10
        const y = Math.floor(index / 10)
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) return false
        return hasTreasureHint(ny * 10 + nx)
      })
    ) return

    const x = index % 10
    const y = Math.floor(index / 10)

    adjacentOffsets.forEach(({ dx, dy }) => {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) return

      const nIndex = ny * 10 + nx
      const neighbor = props.tiles[nIndex]
      if (neighbor?.revealed || neighbor?.ghosted) return
      if (hasHint(nIndex)) return

      marked.add(nIndex)
    })
  })

  return marked
}

function getAutoMarker(index) {
  const tile = props.tiles[index]
  if (tile?.revealed || tile?.ghosted) return false
  if (hasHint(index)) return false

  if (crabAutoSet.value.has(index)) return 'hint-crab-eyes-maybe'
  if (sandAutoSet.value.has(index)) return 'hint-nothing'
  return ''
}

function outerClasses(tile, index) {
  if (diggingSet.value.has(index))    return ['bg-base-200', 'cursor-wait']
  if (confirmIndex.value === index)   return ['practice-confirming', 'cursor-pointer']
  if (tile?.revealed)                 return [tile.type, 'practice-reveal']
  if (tile?.ghosted)                  return ['practice-ghosted', tile.type]

  const hints = engine.tiles.value[index]
  if (hints?.length) return [...hints, 'cursor-pointer']
  const autoMarker = getAutoMarker(index)
  if (autoMarker) return [autoMarker, 'cursor-pointer']

  return props.gameOver
    ? ['bg-base-100']
    : ['bg-base-100', 'cursor-pointer', 'practice-undigged']
}
</script>

<style scoped>
.contain-please {
  position: relative;
  --label-size: 10%;
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

.tile { position: relative; }

/* ── Hover shovel (idle) ── */
.hover-shovel-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.practice-undigged:hover .hover-shovel-wrap { opacity: 0.55; }
.hover-shovel-icon { width: 45%; height: 45%; }

/* ── Confirm dig: pulsing shovel waiting for 2nd click ── */
.practice-confirming {
  animation: confirm-pulse 0.65s ease-in-out infinite alternate;
  outline: 2px solid oklch(var(--color-warning) / 0.9);
  outline-offset: -2px;
  z-index: 1;
}

.confirm-dig-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(var(--color-warning) / 0.15);
}

.confirm-check-icon {
  width: 55%;
  height: 55%;
  animation: confirm-check-bob 0.65s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 4px oklch(var(--color-warning) / 0.8));
}

@keyframes confirm-pulse {
  from { background-color: oklch(var(--color-warning) / 0.06); }
  to   { background-color: oklch(var(--color-warning) / 0.22); }
}
@keyframes confirm-check-bob {
  from { transform: translateY(-2px) rotate(-12deg); }
  to   { transform: translateY(2px)  rotate(8deg);   }
}

/* ── Digging animation ── */
.practice-digging-anim {
  animation: dig-vibrate 0.1s linear infinite;
}

.tile-icon {
  width: 72%;
  height: 72%;
}

.tile.near-sand,
.tile.near-hint-sand {
  position: relative;
}

.tile.near-sand::after,
.tile.near-hint-sand::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.65;
  border-radius: inherit;
}

.tile.near-sand-top::after,
.tile.near-hint-sand-top::after {
  background: oklch(var(--color-error) / 0.8);
  clip-path: inset(0 35% 82% 35% round 9999px);
}

.tile.near-sand-right::after,
.tile.near-hint-sand-right::after {
  background: oklch(var(--color-error) / 0.8);
  clip-path: inset(35% 0 35% 82% round 9999px);
}

.tile.near-sand-bottom::after,
.tile.near-hint-sand-bottom::after {
  background: oklch(var(--color-error) / 0.8);
  clip-path: inset(82% 35% 0 35% round 9999px);
}

.tile.near-sand-left::after,
.tile.near-hint-sand-left::after {
  background: oklch(var(--color-error) / 0.8);
  clip-path: inset(35% 82% 35% 0 round 9999px);
}

.tile.near-sand:not([class*="near-sand-"])::after,
.tile.near-hint-sand:not([class*="near-hint-sand-"])::after {
  background: radial-gradient(circle, oklch(var(--color-error) / 0.8) 0 18%, transparent 20%);
  clip-path: inset(41% 41% 41% 41%);
}

.tile.hint-crab:not(.crab) {
  background-image: none;
}

.digging-shovel-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
}

.digging-shovel-icon {
  width: 55%;
  height: 55%;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
  animation: shovel-strike 0.35s ease-in-out infinite;
  transform-origin: 50% 35%;
}

@keyframes dig-vibrate {
  0%   { transform: translate(0,    0   ); }
  25%  { transform: translate(-1px, 1px ); }
  50%  { transform: translate(1px,  -1px); }
  75%  { transform: translate(-1px, -1px); }
  100% { transform: translate(0,    0   ); }
}

@keyframes shovel-strike {
  0%   { transform: rotate(-10deg) translateY(0px);  }
  35%  { transform: rotate(-55deg) translateY(-5px); }
  65%  { transform: rotate(10deg)  translateY(4px);  }
  100% { transform: rotate(-10deg) translateY(0px);  }
}

/* ── Ghosted / reveal ── */
.practice-ghosted { opacity: 0.7; }

.practice-reveal {
  animation: tile-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes tile-pop {
  0%   { transform: scale(0.6); opacity: 0.5; }
  100% { transform: scale(1);   opacity: 1;   }
}
</style>
