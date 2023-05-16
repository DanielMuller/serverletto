import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('pages/IndexPage.vue'),
      },
    ],
  },
  {
    path: '/participant/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'invalid',
        name: 'InvalidCode',
        component: () => import('pages/participant/InvalidCode.vue'),
      },
      {
        path: ':token',
        component: () => import('pages/participant/RegisterSteps.vue'),
      },
    ],
  },
  {
    path: '/auth/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Auth',
        component: () => import('pages/auth/IndexPage.vue'),
      },
    ],
  },
  {
    path: '/admin/',
    component: () => import('layouts/MainLayout.vue'),
    meta: {
      requiresAuth: true,
      subMenu: true,
    },
    children: [
      {
        name: 'Admin',
        path: '',
        component: () => import('pages/admin/IndexPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
