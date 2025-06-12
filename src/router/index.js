// src/router/index.js
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import Home from '@/views/Home.vue'
import LandDetails from '@/views/LandDetails.vue'
import TodaysChecklist from '@/views/TodaysChecklist.vue'

const routes = [
  { path: '/', name: 'Home', redirect: '/digging' },
  { path: '/digging', name: 'GuestDigging', component: GuestDigging },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging
  },
  {
    path: '/:landId(\\d+)', name: 'DiggingAsHome',
    redirect: to => {
      return `/${to.params.landId}/digging`
    },
  },
  { path: '/details', component: LandDetails },
  {
    path: '/:landId(\\d+)/details',
    name: 'LandDetailsWithId',
    component: LandDetails
  },
  {
    path: '/details',
    name: 'LandDetailsNoId',
    component: LandDetails,
    props: route => ({ landId: undefined }),
  },
  // Today’s Checklist (no landId) — lets user input their own
  {
    path: '/todays-checklist',
    name: 'TodaysChecklist',
    component: TodaysChecklist,
    props: { useParam: false }
  },
  // Today’s Checklist scoped under a known landId
  {
    path: '/:landId(\\w+)/todays-checklist',
    name: 'TodaysChecklistWithId',
    component: TodaysChecklist,
    props: route => ({ useParam: true, landIdParam: route.params.landId })
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const history = import.meta.env.SSR
  ? createMemoryHistory()
  : createWebHistory()

export default createRouter({
  history,
  routes
})
