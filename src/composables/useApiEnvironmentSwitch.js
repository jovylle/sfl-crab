import { useRoute, useRouter } from 'vue-router'
import { useApiEnvironment } from '@/composables/useApiEnvironment.js'
import { useLandSync } from '@/composables/useLandSync'
import { resolveLandRoute, swapTestnetOnRoute } from '@/utils/landRoutes.js'

/** Switch production ↔ api-dev (testnet) and keep the route prefix in sync. */
export function useApiEnvironmentSwitch () {
  const route = useRoute()
  const router = useRouter()
  const { isTestServer, setApiEnvironment, testExampleLandId } = useApiEnvironment()

  function switchEnvironment (env) {
    if (env === (isTestServer.value ? 'test' : 'production')) return

    const hasLand = Boolean(route.params.landId)
    if (hasLand) {
      const label = env === 'test' ? 'testnet (api-dev)' : 'production'
      const ok = window.confirm(
        `Switch to the ${label} API? Refresh land data afterward so tiles match that server.`,
      )
      if (!ok) return
    }

    setApiEnvironment(env)
    router.replace(swapTestnetOnRoute(route, env === 'test'))

    const landId = route.params.landId
    if (landId) {
      setTimeout(() => {
        const { reloadFromServer } = useLandSync({ landId })
        reloadFromServer({ landId, force: true })
      }, 100)
    }
  }

  function toggleTestnet () {
    switchEnvironment(isTestServer.value ? 'production' : 'test')
  }

  function openExampleTestLand () {
    const id = testExampleLandId
    if (route.params.landId === id && isTestServer.value) return
    router.push(resolveLandRoute('digging', { landId: id, test: true }))
  }

  return {
    isTestServer,
    toggleTestnet,
    openExampleTestLand,
    testExampleLandId,
  }
}
