<template>
  <div class="space-y-2">
    <p v-if="isAuthenticated" class="text-sm text-base-content/80 truncate">
      {{ accountLabel }}
    </p>
    <p v-else class="text-sm text-base-content/60">
      Optional — sync your dig profile on the hub.
    </p>
    <div class="flex flex-col gap-2">
      <router-link
        v-if="!isAuthenticated"
        :to="loginTo"
        class="btn btn-primary btn-sm btn-block"
        @click="closeMainDrawer"
      >
        Approve login
      </router-link>
      <template v-else>
        <router-link
          to="/login"
          class="btn btn-ghost btn-sm btn-block"
          @click="closeMainDrawer"
        >
          Account
        </router-link>
        <button
          type="button"
          class="btn btn-outline btn-sm btn-block"
          @click="signOut"
        >
          Sign out
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHubSession } from '@/composables/useHubSession.js'
import { closeMainDrawer } from '@/utils/drawerToggle.js'

const route = useRoute()
const { isAuthenticated, accountLabel, logout } = useHubSession()

const loginTo = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

async function signOut () {
  await logout()
  closeMainDrawer()
}
</script>
