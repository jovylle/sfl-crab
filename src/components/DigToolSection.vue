<template>
  <div class="flex gap-4 mb-1 justify-center items-center">
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn m-1 btn-bg-accent">
        <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-5 w-5 stroke-current md:h-6 md:w-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </div>
      <div tabindex="0" class="dropdown-content card card-sm bg-base-100 z-1 shadow-md">
        <div class="card-body">
          <div class="space-y-4 text-left">
            <button
              class="btn btn-warning tooltip btn-sm text-nowrap"
              data-tip="🧹 Clear all custom marks"
              @click="grid.clear()"
            >
              🧹 Clear Marks
            </button>

            <!-- Controlled checkbox -->
            <label class="flex items-center mx-auto">
              <input
                type="checkbox"
                :checked="showTreasureOrder"
                @change="$emit('update:showTreasureOrder', $event.target.checked)"
                class="checkbox mr-2"
              />
              Show treasure order
            </label>
          </div>
        </div>
      </div>
    </div>

    <InputLandIdOrRefresh />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useGridManager } from '@/composables/useGridManager'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'

// grid.clear() still lives here
const route = useRoute()
const landId = route.params.landId || '0'
const grid = useGridManager(landId)

// Define the incoming prop and the event you’ll emit
defineProps({
  showTreasureOrder: { type: Boolean, required: true }
})
// we’ll emit update:showTreasureOrder via @change above
defineEmits(['update:showTreasureOrder'])
</script>
