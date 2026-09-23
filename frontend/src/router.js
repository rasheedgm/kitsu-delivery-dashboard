import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewView from './views/OverviewView.vue'
import ProductionView from './views/ProductionView.vue'
import DeliveryView from './views/DeliveryView.vue'
import SettingsView from './views/SettingsView.vue'

const routes = [
  { path: '/', name: 'overview', component: OverviewView },
  { path: '/production', name: 'production', component: ProductionView },
  { path: '/delivery', name: 'delivery', component: DeliveryView },
  { path: '/settings', name: 'settings', component: SettingsView }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Kitsu passes context (dark_theme, production_id, episode_id) on the *real*
// query string, but this app uses hash routing. On the first navigation, copy
// those params into the hash route so components can read them from useRoute().
let queryTransferred = false
router.beforeEach((to, from, next) => {
  if (queryTransferred) return next()
  queryTransferred = true
  const realParams = new URLSearchParams(window.location.search)
  if (!realParams.toString()) return next()
  const query = { ...to.query }
  realParams.forEach((value, key) => {
    if (query[key] === undefined) query[key] = value
  })
  next({ path: to.path, query, replace: true })
})

export default router
