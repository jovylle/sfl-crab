// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import LandProfile from '@/views/LandProfile.vue'
import Digging from '@/views/Digging.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    // Optional landId: only digits, zero or one occurrence,
    // so it matches both "/digging"  and "/123/digging"
    path: '/:landId(\\d+)?/digging',
    name: 'Digging',
    component: Digging,
    // pass landId (or undefined if none) as prop
    props: route => ({ landId: route.params.landId }),
  },
  {
    path: '/:landId(\\d+)',
    name: 'LandProfile',
    component: LandProfile,
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
