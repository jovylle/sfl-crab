<template>
  <button :disabled="isRefreshDisabled" @click="handleRefresh" class="refresh-btn">
    <span v-if="isRefreshing" class="loading">⏳</span>
    <span v-else-if="isCooldown">Wait {{ remaining }}s</span>
    <span v-else>Refresh From Server</span>
  </button>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useLandSync } from '@/composables/useLandSync';
import { useLandData } from '@/composables/useLandData';
import { useRoute }    from 'vue-router';

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
  // console.log('✅ landData ref reloaded');
}
</script>

<style scoped>
.refresh-btn {
  padding: .5rem 1rem;
  border: none;
  border-radius: .25rem;
  background: var(--color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
}
.refresh-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.loading {
  font-size: 1em;
}
</style>
