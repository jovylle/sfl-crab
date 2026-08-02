<template>
  <button
    :disabled="isLoading || isCooldown || isHistoricalView"
    @click="reloadFromServer"
    class="refresh-btn btn btn-primary btn-sm sm:btn-md text-xs sm:text-sm text-nowrap text-base-100"
  >
    <span v-if="isLoading" class="loading">⏳</span>
    <span v-else-if="isCooldown" class="tooltip">
      Wait {{ remaining }}s
    </span>
    <span v-else-if="isHistoricalView" class="tooltip" data-tip="Refresh is disabled while viewing a past date">
      Viewing history
    </span>
    <span v-else class="tooltip" data-tip="Refresh Land Data">
      Refresh Data
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLandSync } from '@/composables/useLandSync'

// all instances share these refs!
const { isLoading, isCooldown, remaining, reloadFromServer } = useLandSync()

const UTC_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const route = useRoute()
const isHistoricalView = computed(() => {
  const dateParam = route.query.date
  const todayUTC = new Date().toISOString().slice(0, 10)
  return typeof dateParam === 'string' && UTC_DATE_RE.test(dateParam) && dateParam < todayUTC
})
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
