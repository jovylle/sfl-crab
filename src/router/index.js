// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { syncApiEnvFromRoute } from '@/utils/landRoutes.js'
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

const LAND_QUERY_PROMOTE = { GuestDigging: 'Digging' } // extend later if needed
router.beforeEach((to) => {
  syncApiEnvFromRoute(to)
  if (to.params.landId) return                       // already has one; avoids redirect loop
  const target = LAND_QUERY_PROMOTE[to.name]
  if (!target) return
  const land = String(to.query.land || '').trim()
  if (!/^\d+$/.test(land)) return
  const query = { ...to.query }
  delete query.land
  return { name: target, params: { landId: land }, query, hash: to.hash }
})

export default router
