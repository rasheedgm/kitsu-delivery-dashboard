<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMetrics } from '../composables/useMetrics.js'
import { useDashboardData } from '../composables/useDashboardData.js'
import { useSavedViews } from '../composables/useSavedViews.js'
import { filterFromQuery, filterToQuery, hasFilterParams, isDefaultFilter, stripFilterKeys } from '../lib/filters.js'
import RecoveryQueueTable from '../components/RecoveryQueueTable.vue'
import SavedViewsBar from '../components/SavedViewsBar.vue'

const route = useRoute()
const router = useRouter()
const { queueRows, rows } = useMetrics()
const { selectedProjectId } = useDashboardData()
const { views, save, remove } = useSavedViews()

const filter = computed(() => filterFromQuery(route.query))
const tableRows = computed(() => queueRows(filter.value))

// Kitsu embeds this app in an iframe, so the browser's own address bar never
// shows our route — it stays on Kitsu's fixed plugin URL. The hash-routed
// filter is still real (it's window.location.href *inside the iframe*, and
// "Copy link" below copies exactly that), but nothing survives a genuine
// page reload on its own: the iframe reloads at its bare src with no hash.
// Remembering the last filter here is what makes "survives a reload" true
// in practice — land on the tab with no filter in the URL and get back
// whatever you had last, rather than resetting to the default.
const LAST_FILTER_KEY = 'kitsu-delivery-dashboard:lastQueueFilter'

onMounted(() => {
  if (hasFilterParams(route.query)) return // arrived via a link/drill-through/saved view — respect it
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_FILTER_KEY) || 'null')
    if (saved && Object.keys(saved).length) {
      router.replace({ path: '/delivery', query: { ...route.query, ...saved } })
    }
  } catch {
    // ignore — private browsing / blocked storage
  }
})

watch(
  filter,
  (f) => {
    try {
      if (isDefaultFilter(f)) localStorage.removeItem(LAST_FILTER_KEY)
      else localStorage.setItem(LAST_FILTER_KEY, JSON.stringify(filterToQuery(f)))
    } catch {
      // ignore
    }
  },
  { deep: true }
)

function updateFilter(patch) {
  router.replace({
    path: '/delivery',
    query: {
      ...stripFilterKeys(route.query),
      ...filterToQuery({ ...filter.value, ...patch })
    }
  })
}

function applyView(view) {
  if (view.projectId) selectedProjectId.value = view.projectId
  router.push({ path: '/delivery', query: { ...view.query } })
}

function saveCurrentView(name) {
  save(name, {
    tab: 'delivery',
    query: filterToQuery(filter.value),
    projectId: selectedProjectId.value
  })
}
</script>

<template>
  <section>
    <SavedViewsBar :views="views" @apply="applyView" @save="saveCurrentView" @remove="remove" />
    <RecoveryQueueTable :rows="tableRows" :all-rows="rows" :filter="filter" @update:filter="updateFilter" />
  </section>
</template>
