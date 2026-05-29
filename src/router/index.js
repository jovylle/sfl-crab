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

router.beforeEach((to) => {
  syncApiEnvFromRoute(to)
})

export default router
