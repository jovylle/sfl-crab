import LoginView from '@/features/auth/LoginView.vue'
import AuthCallbackView from '@/features/auth/AuthCallbackView.vue'

/** @type {import('vue-router').RouteRecordRaw[]} */
export const authRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { hideChrome: true, public: true },
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: AuthCallbackView,
    meta: { hideChrome: true, public: true },
  },
]
