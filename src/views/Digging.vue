<!-- src/views/Digging.vue -->
 <template>
  <div class="flex [@media(max-width:639px)]:flex-col lg:gap-4 justify-center">
    <!-- Manual Marks clear & Grid -->
    <div class="card w-full min-w-[260px] sm:min-w-[300px] flex-1 max-w-md md:max-w-xl sm:basis-[410px] mx-auto sm:mx-0">
      <div class="card-body [@media(max-width:639px)]:p-3">
        <ClearMarks />

        <!-- Now simply render Grid.vue — it will read from our manager -->
        <Grid />
      </div>
    </div>

    <TodayPatterns />
  </div>
  <div>
    <InfoFooter />
  </div>
</template>

<script setup>
import { onMounted, watch }            from 'vue'
import { useRoute }         from 'vue-router'

import ClearMarks from '@/components/ClearMarks.vue'
import Grid                 from '@/components/Grid.vue'
import TodayPatterns        from '@/components/TodayPatterns.vue'
import InfoFooter           from '@/components/InfoFooter.vue'

import { useLandData }      from '@/composables/useLandData'
import { useGridManager }   from '@/composables/useGridManager'

// 1) Grab landId from the URL
const route  = useRoute()
const landId = route.params.landId

// 2) Pull in your land‐blob store so we can watch its grid
const defaults = { state: { inventory: {}, desert: { digging: { grid: [] } } } }
const { desert } = useLandData(defaults)

// 3) Initialize your per‐land grid manager
const grid = useGridManager(landId)

// 4) Whenever the server grid changes, re‐populate & re‐overlay hints
watch(
  () => desert.value.digging?.grid,
  apiGrid => apiGrid && grid.update(apiGrid),
  { immediate: true }
)
onMounted(() => {
  console.log('Digging component mounted.')
  // Example: re-fetch or validate data
  if (!landId) {
    console.info('No landId set on mount.')
  }else{
    console.info('Yes land ID.')
    // loadFromStorage(landId.value)
  }
})
</script>

<style scoped>
/* keep your Tailwind/custom styling */
</style>
