import FeedbackGallery from '@/views/FeedbackGallery.vue'
import PublicPracticeRun from '@/views/PublicPracticeRun.vue'
import PublicDigDay from '@/views/PublicDigDay.vue'
import Admin from '@/views/Admin.vue'
import Account from '@/views/Account.vue'
import { legacyTestPathRedirect } from '@/utils/testnet.js'

/** @type {import('vue-router').RouteRecordRaw[]} */
export const publicRoutes = [
  {
    path: '/feedbacks',
    name: 'FeedbackGallery',
    component: FeedbackGallery,
    meta: { public: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { hideChrome: true, public: true },
  },
  {
    path: '/account',
    name: 'Account',
    component: Account,
    meta: { public: true },
  },
  {
    path: '/practice/run/:id',
    name: 'PublicPracticeRun',
    component: PublicPracticeRun,
    meta: { public: true },
  },
  {
    path: '/:landId(\\d+)/dig-day',
    name: 'PublicDigDay',
    component: PublicDigDay,
    meta: { public: true },
  },
  {
    path: '/test/:pathMatch(.*)*',
    name: 'LegacyTestPath',
    redirect: to => legacyTestPathRedirect(to) || '/digging',
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
