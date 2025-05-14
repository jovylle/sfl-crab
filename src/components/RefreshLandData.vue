<template>
  <button :disabled="isRefreshDisabled" @click="handleRefresh" class="refresh-btn btn btn-primary">
    <span v-if="isRefreshing" class="loading">⏳</span>
    <span data-tip="Wait a bit" class="tooltip" v-else-if="isCooldown">Wait {{ remaining }}s</span>
    <span data-tip="Refresh From Server" class="tooltip" v-else>Refresh Data</span>
  </button>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useLandSync } from '@/composables/useLandSync';
import { useLandData } from '@/composables/useLandData';
import { useRoute }    from 'vue-router';
import { useSoftReload } from '@/composables/useSoftReload'

const { softReload } = useSoftReload()

const { isRefreshing, isCooldown, isRefreshDisabled, refresh } = useLandSync();

// Bring in reload() so we can pull fresh data into Vue after sync
const { reload } = useLandData({
  state: { inventory: {}, desert: { digging: { grid: [] } } }
});
const landId = useRoute().params.landId;

// Cooldown timer logic (unchanged)
const remaining = ref(0);
let intervalId;
watch(isCooldown, (cool) => {
  if (cool) {
    const end = Date.now() + 15000;
    remaining.value = Math.ceil((end - Date.now()) / 1000);
    intervalId = setInterval(() => {
      remaining.value = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (remaining.value === 0) clearInterval(intervalId);
    }, 1000);
  } else {
    remaining.value = 0;
    clearInterval(intervalId);
  }
});
onBeforeUnmount(() => clearInterval(intervalId));

// Wrapper click handler: sync → log → reload
async function handleRefresh() {
  console.log('⚙️ Starting refresh for land', landId);
  await refresh();  
  // console.log('📥 After sync, localStorage:', localStorage.getItem(`landData_${landId}`));
  reload();
  softReload();
  // console.log('✅ landData ref reloaded');
}
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
