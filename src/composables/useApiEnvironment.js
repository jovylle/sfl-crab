import { ref, computed } from 'vue'
import {
  API_ENVIRONMENTS,
  TEST_SERVER_EXAMPLE_LAND_ID,
  getApiEnvironment,
  setApiEnvironment as persistApiEnvironment,
} from '@/config/api.js'
import { isApiDevMenuUnlocked } from '@/utils/apiDevUnlock.js'

const apiEnvironment = ref(
  typeof window !== 'undefined' ? getApiEnvironment() : 'production',
)

const apiDevMenuUnlocked = ref(
  typeof window !== 'undefined' ? isApiDevMenuUnlocked() : false,
)

if (typeof window !== 'undefined') {
  window.addEventListener('sfl-api-environment-changed', (event) => {
    apiEnvironment.value = event.detail?.env ?? getApiEnvironment()
  })
  window.addEventListener('sfl-api-dev-menu-unlocked', () => {
    apiDevMenuUnlocked.value = true
  })
}

export function useApiEnvironment () {
  const isTestServer = computed(() => apiEnvironment.value === 'test')
  const showApiDevControls = computed(() => apiDevMenuUnlocked.value)

  function setApiEnvironment (env) {
    persistApiEnvironment(env)
    apiEnvironment.value = getApiEnvironment()
  }

  return {
    apiEnvironment,
    isTestServer,
    showApiDevControls,
    setApiEnvironment,
    environments: API_ENVIRONMENTS,
    testExampleLandId: TEST_SERVER_EXAMPLE_LAND_ID,
  }
}
