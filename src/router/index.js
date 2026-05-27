// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { syncApiEnvFromRoute } from '@/utils/landRoutes.js'
import {
  hasTestnetQuery,
  isTestnetLandId,
  withTestnetQuery,
} from '@/utils/testnet.js'
import { diggingRoutes } from '@/router/routes/digging.js'
import { publicRoutes } from '@/router/routes/public.js'
import { authRoutes } from '@/router/routes/auth.js'

const routes = [...diggingRoutes, ...authRoutes, ...publicRoutes]

const history = import.meta.env.SSR
  ? createMemoryHistory()
  : createWebHistory()

const router = createRouter({
  history,
  routes,
})

router.beforeEach((to) => {
  const landId = to.params.landId
  if (landId && isTestnetLandId(landId) && !hasTestnetQuery(to.query, to.fullPath)) {
    return {
      path: to.path,
      query: withTestnetQuery({ ...to.query }, true),
      hash: to.hash,
      replace: true,
    }
  }

  syncApiEnvFromRoute(to)
})

export default router
