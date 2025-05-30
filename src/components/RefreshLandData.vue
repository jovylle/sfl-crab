<template>
  <button
    :disabled="isLoading || isCooldown"
    @click="reloadFromServer"
    class="refresh-btn btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm text-nowrap text-base-100"
  >
    <span v-if="isLoading" class="loading">⏳</span>
    <span v-else-if="isCooldown" class="tooltip">
      Wait {{ remaining }}s
    </span>
    <span v-else class="tooltip" data-tip="Refresh Land Data">
      Refresh Data
    </span>
  </button>
</template>

<script setup>
import { useLandSync } from '@/composables/useLandSync'

// all instances share these refs!
const { isLoading, isCooldown, remaining, reloadFromServer } = useLandSync()
</script>

<style scoped>
.refresh-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.loading {
  font-size: 1em;
}
</style>
