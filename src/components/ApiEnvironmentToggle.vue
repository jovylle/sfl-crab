<template>
  <div class="space-y-3">
    <p class="text-sm text-base-content/70">
      Load farm data from production or the Sunflower Land test API
      (<code class="text-xs">api-dev</code>). Test farms use a separate API key on the server.
    </p>

    <div class="join join-vertical w-full sm:join-horizontal">
      <button
        type="button"
        class="btn join-item flex-1"
        :class="!isTestServer ? 'btn-primary' : 'btn-ghost'"
        @click="selectEnvironment('production')"
      >
        Production
      </button>
      <button
        type="button"
        class="btn join-item flex-1"
        :class="isTestServer ? 'btn-warning' : 'btn-ghost'"
        @click="selectEnvironment('test')"
      >
        Test server
      </button>
    </div>

    <p v-if="isTestServer" class="text-xs text-warning-content bg-warning/20 rounded-lg p-2">
      On the test API there is no land ID 1. Try
      <button
        type="button"
        class="link link-primary font-mono"
        @click="useExampleLandId"
      >
        {{ testExampleLandId }}
      </button>
      or your own test farm ID, then refresh land data.
    </p>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'
import { useLandSync } from '@/composables/useLandSync'
import { resolveLandRoute, swapTestPrefixInPath } from '@/utils/landRoutes.js'

const route = useRoute()
const router = useRouter()
const { isTestServer, setApiEnvironment, testExampleLandId } = useApiEnvironment()

function selectEnvironment (env) {
  if (env === (isTestServer.value ? 'test' : 'production')) return

  const hasLand = Boolean(route.params.landId)
  if (hasLand) {
    const label = env === 'test' ? 'test (api-dev)' : 'production'
    const ok = window.confirm(
      `Switch to the ${label} API? Refresh land data afterward so tiles match that server.`,
    )
    if (!ok) return
  }

  setApiEnvironment(env)
  router.replace(swapTestPrefixInPath(route.fullPath, env === 'test'))

  const landId = route.params.landId
  if (landId) {
    setTimeout(() => {
      const { reloadFromServer } = useLandSync({ landId })
      reloadFromServer({ landId, force: true })
    }, 100)
  }
}

function useExampleLandId () {
  const id = testExampleLandId
  if (route.params.landId === id && isTestServer.value) return
  router.push(resolveLandRoute('digging', { landId: id, test: true }))
}
</script>
