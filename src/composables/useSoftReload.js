// src/composables/useSoftReload.js
import { useRoute, useRouter } from 'vue-router'

export function useSoftReload () {
  const route = useRoute()
  const router = useRouter()

  const softReload = () => {
    console.log('Soft reload triggered');
    router.replace({
      path: route.path,
      query: { ...route.query, __t: Date.now() }
    })
  }

  return { softReload }
}
