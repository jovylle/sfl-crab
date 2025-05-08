// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import Home from '@/views/Home.vue'
import LandProfile from '@/views/LandProfile.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/digging', name: 'GuestDigging', component: GuestDigging },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging
  },
  { path: '/:landId(\\d+)', name: 'LandProfile', component: LandProfile },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
