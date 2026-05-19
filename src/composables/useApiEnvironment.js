import { ref, computed } from 'vue'
import {
  API_ENVIRONMENTS,
  TEST_SERVER_EXAMPLE_LAND_ID,
  getApiEnvironment,
  setApiEnvironment as persistApiEnvironment,
} from '@/config/api.js'

const apiEnvironment = ref(
  typeof window !== 'undefined' ? getApiEnvironment() : 'production',
)

if (typeof window !== 'undefined') {
  window.addEventListener('sfl-api-environment-changed', (event) => {
    apiEnvironment.value = event.detail?.env ?? getApiEnvironment()
  })
}

export function useApiEnvironment () {
  const isTestServer = computed(() => apiEnvironment.value === 'test')

  function setApiEnvironment (env) {
    persistApiEnvironment(env)
    apiEnvironment.value = getApiEnvironment()
  }

  return {
    apiEnvironment,
    isTestServer,
    setApiEnvironment,
    environments: API_ENVIRONMENTS,
    testExampleLandId: TEST_SERVER_EXAMPLE_LAND_ID,
  }
}
