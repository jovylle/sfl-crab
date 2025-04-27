// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Digging from '@/views/Digging.vue'  // you can flesh this out later

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/digging', name: 'Digging', component: Digging },
  // …add more pages here
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
