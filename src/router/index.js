// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import Home from '@/views/Home.vue'
import LandProfile from '@/views/LandProfile.vue'
import LandDetails from '@/views/LandDetails.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/digging', name: 'GuestDigging', component: GuestDigging },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging
  },
  { path: '/:landId(\\d+)', name: 'LandProfile', component: LandProfile },
  { path: '/:pathMatch(.*)*', redirect: '/' },
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
]

export default createRouter({
  history: createWebHistory(),
  routes
})
