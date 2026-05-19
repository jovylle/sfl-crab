<template>
  <div
    v-if="show"
    class="alert alert-warning text-sm py-2 px-3 mb-2 shadow-sm"
    role="status"
  >
    <span class="flex-1">
      Testnet farm (api-dev). Share links with
      <code class="text-xs">?{{ TESTNET_QUERY }}</code> in the URL.
    </span>
    <button
      type="button"
      class="btn btn-ghost btn-xs shrink-0"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { isTestApiEnvironment } from '@/config/api.js'
import { hasTestnetQuery, isTestnetLandId, TESTNET_QUERY } from '@/utils/testnet.js'

const route = useRoute()
const dismissed = ref(false)

const show = computed(() => {
  if (dismissed.value) return false
  const id = route.params.landId
  if (!id || !isTestnetLandId(id)) return false
  return isTestApiEnvironment() && hasTestnetQuery(route.query)
})
</script>
