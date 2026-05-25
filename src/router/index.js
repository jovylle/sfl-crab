// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import Home from '@/views/Home.vue'
import LandDetails from '@/views/LandDetails.vue'
import TodaysChecklist from '@/views/TodaysChecklist.vue'
import FeedbackGallery from '@/views/FeedbackGallery.vue'
import PracticeDigging from '@/views/PracticeDigging.vue'
import PublicPracticeRun from '@/views/PublicPracticeRun.vue'
import PublicDigDay from '@/views/PublicDigDay.vue'
import Admin from '@/views/Admin.vue'
import { syncApiEnvFromRoute } from '@/utils/landRoutes.js'
import { setApiEnvironment, getApiEnvironment } from '@/config/api.js'
import {
  hasTestnetQuery,
  isTestnetLandId,
  legacyTestPathRedirect,
  withTestnetQuery,
} from '@/utils/testnet.js'

const routes = [
  { path: '/', name: 'Home', redirect: '/digging' },
  {
    path: '/digging',
    name: 'GuestDigging',
    component: GuestDigging,
  },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging,
  },
  {
    path: '/:landId(\\d+)',
    name: 'DiggingAsHome',
    redirect: to => ({
      path: `/${to.params.landId}/digging`,
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/details',
    name: 'LandDetailsNoId',
    component: LandDetails,
    props: () => ({ landId: undefined }),
  },
  {
    path: '/:landId(\\d+)/details',
    name: 'LandDetailsWithId',
    component: LandDetails,
  },
  {
    path: '/todays-checklist',
    name: 'TodaysChecklist',
    component: TodaysChecklist,
    props: { useParam: false },
  },
  {
    path: '/:landId(\\w+)/todays-checklist',
    name: 'TodaysChecklistWithId',
    component: TodaysChecklist,
    props: route => ({ useParam: true, landIdParam: route.params.landId }),
  },
  {
    path: '/feedbacks',
    name: 'FeedbackGallery',
    component: FeedbackGallery,
  },
  {
    path: '/practice',
    name: 'Practice',
    component: PracticeDigging,
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { hideChrome: true },
  },
  {
    path: '/:landId(\\d+)/practice',
    name: 'PracticeWithId',
    component: PracticeDigging,
  },
  {
    path: '/practice/run/:id',
    name: 'PublicPracticeRun',
    component: PublicPracticeRun,
  },
  {
    path: '/:landId(\\d+)/dig-day',
    name: 'PublicDigDay',
    component: PublicDigDay,
  },
  // Legacy `/test/...` bookmarks → canonical path + ?testnet
  {
    path: '/test/:pathMatch(.*)*',
    name: 'LegacyTestPath',
    redirect: to => legacyTestPathRedirect(to) || '/digging',
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const history = import.meta.env.SSR
  ? createMemoryHistory()
  : createWebHistory()

const router = createRouter({
  history,
  routes,
})

router.beforeEach((to) => {
  const apiParam = String(to.query?.api || '').toLowerCase()
  if (apiParam === 'test' || apiParam === 'dev') {
    if (getApiEnvironment() !== 'test') setApiEnvironment('test')
    return {
      path: to.path,
      query: withTestnetQuery({ ...to.query }, true),
      hash: to.hash,
      replace: true,
    }
  }
  if (apiParam === 'production' || apiParam === 'prod') {
    if (getApiEnvironment() !== 'production') setApiEnvironment('production')
    const { api: _api, ...query } = to.query
    return { ...to, query, replace: true }
  }

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
