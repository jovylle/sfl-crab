// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import Home from '@/views/Home.vue'
import LandDetails from '@/views/LandDetails.vue'
import TodaysChecklist from '@/views/TodaysChecklist.vue'
import FeedbackGallery from '@/views/FeedbackGallery.vue'
import PracticeDigging from '@/views/PracticeDigging.vue'
import { syncApiEnvFromRoute } from '@/utils/landRoutes.js'

const productionMeta = { apiEnv: 'production' }
const testMeta = { apiEnv: 'test' }

const routes = [
  { path: '/', name: 'Home', redirect: '/digging' },
  {
    path: '/digging',
    name: 'GuestDigging',
    component: GuestDigging,
    meta: productionMeta,
  },
  {
    path: '/test/digging',
    name: 'TestGuestDigging',
    component: GuestDigging,
    meta: testMeta,
  },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging,
    meta: productionMeta,
  },
  {
    path: '/test/:landId(\\d+)/digging',
    name: 'TestDigging',
    component: Digging,
    meta: testMeta,
  },
  {
    path: '/:landId(\\d+)',
    name: 'DiggingAsHome',
    redirect: to => `/${to.params.landId}/digging`,
  },
  {
    path: '/test/:landId(\\d+)',
    name: 'TestDiggingAsHome',
    redirect: to => `/test/${to.params.landId}/digging`,
  },
  { path: '/details', component: LandDetails, meta: productionMeta },
  {
    path: '/:landId(\\d+)/details',
    name: 'LandDetailsWithId',
    component: LandDetails,
    meta: productionMeta,
  },
  {
    path: '/test/details',
    name: 'TestLandDetailsNoId',
    component: LandDetails,
    props: () => ({ landId: undefined }),
    meta: testMeta,
  },
  {
    path: '/test/:landId(\\d+)/details',
    name: 'TestLandDetailsWithId',
    component: LandDetails,
    meta: testMeta,
  },
  {
    path: '/details',
    name: 'LandDetailsNoId',
    component: LandDetails,
    props: () => ({ landId: undefined }),
    meta: productionMeta,
  },
  {
    path: '/todays-checklist',
    name: 'TodaysChecklist',
    component: TodaysChecklist,
    props: { useParam: false },
    meta: productionMeta,
  },
  {
    path: '/test/todays-checklist',
    name: 'TestTodaysChecklist',
    component: TodaysChecklist,
    props: { useParam: false },
    meta: testMeta,
  },
  {
    path: '/:landId(\\w+)/todays-checklist',
    name: 'TodaysChecklistWithId',
    component: TodaysChecklist,
    props: route => ({ useParam: true, landIdParam: route.params.landId }),
    meta: productionMeta,
  },
  {
    path: '/test/:landId(\\w+)/todays-checklist',
    name: 'TestTodaysChecklistWithId',
    component: TodaysChecklist,
    props: route => ({ useParam: true, landIdParam: route.params.landId }),
    meta: testMeta,
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
    meta: productionMeta,
  },
  {
    path: '/test/practice',
    name: 'TestPractice',
    component: PracticeDigging,
    meta: testMeta,
  },
  {
    path: '/:landId(\\d+)/practice',
    name: 'PracticeWithId',
    component: PracticeDigging,
    meta: productionMeta,
  },
  {
    path: '/test/:landId(\\d+)/practice',
    name: 'TestPracticeWithId',
    component: PracticeDigging,
    meta: testMeta,
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
  syncApiEnvFromRoute(to)
})

export default router
