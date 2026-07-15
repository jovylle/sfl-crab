import GuestDigging from '@/views/GuestDigging.vue'
import Digging from '@/views/Digging.vue'
import LandDetails from '@/views/LandDetails.vue'
import TodaysChecklist from '@/views/TodaysChecklist.vue'
import PracticeDigging from '@/views/PracticeDigging.vue'
/** @type {import('vue-router').RouteRecordRaw[]} */
export const diggingRoutes = [
  { path: '/', name: 'Home', redirect: to => ({ path: '/digging', query: to.query, hash: to.hash }) },
  {
    path: '/digging',
    name: 'GuestDigging',
    component: GuestDigging,
    meta: { public: true },
  },
  {
    path: '/:landId(\\d+)/digging',
    name: 'Digging',
    component: Digging,
    meta: { public: true },
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
    meta: { public: true },
  },
  {
    path: '/:landId(\\d+)/details',
    name: 'LandDetailsWithId',
    component: LandDetails,
    meta: { public: true },
  },
  {
    path: '/todays-checklist',
    name: 'TodaysChecklist',
    component: TodaysChecklist,
    props: { useParam: false },
    meta: { public: true },
  },
  {
    path: '/:landId(\\w+)/todays-checklist',
    name: 'TodaysChecklistWithId',
    component: TodaysChecklist,
    props: route => ({ useParam: true, landIdParam: route.params.landId }),
    meta: { public: true },
  },
  {
    path: '/practice',
    name: 'Practice',
    component: PracticeDigging,
    meta: { public: true },
  },
  {
    path: '/:landId(\\d+)/practice',
    name: 'PracticeWithId',
    component: PracticeDigging,
    meta: { public: true },
  },
]
