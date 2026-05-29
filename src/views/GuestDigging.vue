<!-- src/views/GuestDigging.vue -->
<template>
  <DiggingPageLayout>
    <template #toolbar>
      <DigToolSection />
    </template>

    <template #grid>
      <Grid />
    </template>

    <template v-if="hasDailyPatterns" #patterns>
      <TodayPatterns />
    </template>

    <InfoFooter />
  </DiggingPageLayout>
</template>

<script setup>
import { watch, computed }  from 'vue'
import { useRoute }         from 'vue-router'

import DiggingPageLayout    from '@/components/DiggingPageLayout.vue'
import Grid                 from '@/components/Grid.vue'
import TodayPatterns        from '@/components/TodayPatterns.vue'
import InfoFooter           from '@/components/InfoFooter.vue'

import { useLandData }      from '@/composables/useLandData'
import { useGridManager }   from '@/composables/useGridManager'
import DigToolSection from '@/components/DigToolSection.vue'

// 1) Choose a key: if there's no landId, use "0" (guest key)
const route  = useRoute()
const landId = route.params.landId || '0'

// 2) Get the reactive land‐blob slices (grid, username, patterns)
const {
  grid: landGrid,
  dailyPatternKeys,
} = useLandData()    // <— no parameters here!

const hasDailyPatterns = computed(() => dailyPatternKeys.value.length > 0)

// 3) Create (or reuse) the grid manager under "0"
const grid = useGridManager(landId)

// 4) Whenever that underlying grid changes, update our manager
watch(
  () => landGrid?.value,
  apiGrid => {
    if (apiGrid) {
      grid.update(apiGrid)
    }
  },
  { immediate: true }
)
</script>
