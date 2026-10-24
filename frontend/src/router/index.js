import { createRouter, createWebHistory } from 'vue-router';
import LandingView from '../views/LandingView.vue';
import BoardView from '../views/BoardView.vue';
import SharedNoteView from '../views/SharedNoteView.vue';

const routes = [
  { path: '/', name: 'landing', component: LandingView },
  { path: '/app', name: 'board', component: BoardView },
  { path: '/s/:token', name: 'shared', component: SharedNoteView },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
