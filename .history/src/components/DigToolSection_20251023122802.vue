<template>
  <div class="flex gap-4 mb-1 justify-center items-center">
    <InputLandIdOrRefresh />
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn m-1 btn-accent btn-sm sm:btn-md">
        More ⋮
      </div>
      <div
        tabindex="0"
        class="dropdown-content card card-sm bg-base-100 z-1 shadow-lg"
      >
        <div class="card-body">
          <div class="space-y-2 text-left">
            <button
              class="btn btn-warning tooltip btn-sm text-nowrap"
              data-tip="🧹 Clear all custom marks"
              @click="grid.clear()"
            >
              🧹 Clear Marks
            </button>

            <button
              class="btn btn-info tooltip btn-sm text-nowrap"
              :class="{ 'btn-disabled': !grid.canUndo() }"
              data-tip="↶ Undo last mark (Ctrl+Z)"
              @click="handleUndo"
            >
              ↶ Undo
            </button>

            <button
              class="btn btn-success tooltip btn-sm text-nowrap"
              data-tip="📤 Export grid state to clipboard"
              @click="handleExport"
            >
              📤 Export
            </button>

            <button
              class="btn btn-primary tooltip btn-sm text-nowrap"
              data-tip="📥 Import grid state from clipboard"
              @click="handleImport"
            >
              📥 Import
            </button>

            <!-- Controlled checkbox -->
            <label class="flex items-center mx-auto rounded border border-base-300 p-2 tooltip cursor-pointer" data-tip="Show Treasure Order">
              <input
                type="checkbox"
                :checked="showTreasureOrder"
                @change="$emit('update:showTreasureOrder', $event.target.checked)"
                class="checkbox checkbox-sm mr-1 text-nowrap "
              />
              Show Order
            </label>

            <button
              type="button"
              class="btn btn-error btn-sm tooltip"
              data-tip="Clear Land ID"
              @click="clearLandId"
            >
              Clear Land ID
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGridManager } from '@/composables/useGridManager'
import InputLandIdOrRefresh from '@/components/InputLandIdOrRefresh.vue'
import { useRoute, useRouter } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'

const route  = useRoute()
const router = useRouter()
// grid.clear() still lives here
const landId = route.params.landId || '0'
const grid = useGridManager(landId)

// Define the incoming prop and the event you'll emit
defineProps({
  showTreasureOrder: { type: Boolean, required: true }
})
// we'll emit update:showTreasureOrder via @change above
defineEmits(['update:showTreasureOrder'])

function clearLandId () {
  if (route.name === 'Digging') {
    // we're on /:landId/digging → go to /digging
    router.push({ name: 'GuestDigging' })
  } else {
    // default to details no-id
    router.push({ name: 'LandDetailsNoId' })
  }
}

function handleUndo () {
  if (grid.canUndo()) {
    grid.undo()
  }
}

// Keyboard shortcut handler
function handleKeydown (event) {
  // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
}

// Add keyboard event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
