<template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <div
      class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0"
    >
      <div class="card-body [@media(max-width:639px)]:px-3 [@media(max-width:639px)]:pt-1">

        <!-- Header row -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="card-title text-sm sm:text-base">
            Practice Mode
            <span class="badge badge-secondary badge-sm">Round {{ roundCount }}</span>
          </h2>
          <div class="flex gap-2">
            <button
              v-if="!isGameOver"
              class="btn btn-sm btn-warning"
              @click="giveUp"
            >
              Give Up
            </button>
            <button class="btn btn-sm btn-primary" @click="newRound">New Round ↺</button>
          </div>
        </div>

        <!-- Live stats -->
        <div class="flex items-center gap-4 text-sm">
          <span>
            Digs: <strong class="text-lg">{{ digsMade }}</strong>
          </span>
          <span>
            Treasures:
            <strong :class="treasuresFound > 0 ? 'text-success' : ''">{{ treasuresFound }}</strong>
            / {{ totalTreasures }}
          </span>
          <span class="text-base-content/50 text-xs">lower digs = better</span>
        </div>

        <!-- Game over / victory banner -->
        <div v-if="isGameOver" class="alert py-2 text-sm gap-2" :class="bannerClass">
          <span v-if="isVictory">
            🎉 Found all {{ totalTreasures }} treasure{{ totalTreasures !== 1 ? 's' : '' }} in
            <strong>{{ digsMade }} dig{{ digsMade !== 1 ? 's' : '' }}</strong>!
            <span v-if="digsMade <= totalTreasures + 2"> Impressive!</span>
          </span>
          <span v-else>
            Round over — found
            <strong>{{ treasuresFound }}</strong> / {{ totalTreasures }} in
            <strong>{{ digsMade }}</strong> digs. Ghosted tiles show what was hidden.
          </span>
        </div>

        <!-- Practice grid — keyed by round so it fully remounts each game -->
        <PracticeGrid
          :key="`round-${roundCount}`"
          :tiles="displayTiles"
          :game-over="isGameOver"
          @dig="dig"
        />

        <!-- Legend + controls hint -->
        <div class="flex gap-3 text-[0.65rem] text-base-content/50 mt-1 flex-wrap justify-center">
          <span class="flex items-center gap-1">
            <Icon icon="noto:shovel" class="w-3.5 h-3.5" /> Click to dig
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="noto:crab" class="w-3.5 h-3.5" /> Crab
          </span>
          <span class="flex items-center gap-1">
            <img
              :src="getImageSrc('/my_images/sand.png').value"
              alt="Sand"
              class="w-3.5 h-3.5 object-contain"
            />
            Sand
          </span>
          <span class="flex items-center gap-1 text-base-content/30">
            Right-click to mark
          </span>
        </div>

      </div>
    </div>

    <!-- Right: pattern reference for this round -->
    <PracticePatterns :pattern-keys="usedFormationKeys" />
  </div>

  <div>
    <InfoFooter />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { usePracticeEngine } from '@/composables/usePracticeEngine.js'
import { useLandData } from '@/composables/useLandData.js'
import { useReliableAssets } from '@/composables/useReliableAssets.js'
import { DIGGING_FORMATIONS } from '@/data/game/diggingFormations.js'
import PracticeGrid from '@/components/PracticeGrid.vue'
import PracticePatterns from '@/components/PracticePatterns.vue'
import InfoFooter from '@/components/InfoFooter.vue'

const ALL_FORMATION_KEYS = Object.keys(DIGGING_FORMATIONS)

const {
  displayTiles,
  digsMade,
  isGameOver,
  isVictory,
  usedFormationKeys,
  roundCount,
  treasuresFound,
  totalTreasures,
  startGame,
  dig,
  giveUp,
} = usePracticeEngine()

const { getImageSrc } = useReliableAssets()

// Use today's stored patterns if user is at /:landId/practice, otherwise use all
const { patternKeys } = useLandData()

function newRound() {
  const keys = patternKeys.value?.length ? patternKeys.value : ALL_FORMATION_KEYS
  startGame(keys)
}

const bannerClass = computed(() => {
  if (isVictory.value) return 'alert-success'
  if (treasuresFound.value > 0) return 'alert-info'
  return 'alert-warning'
})

onMounted(() => newRound())
</script>
