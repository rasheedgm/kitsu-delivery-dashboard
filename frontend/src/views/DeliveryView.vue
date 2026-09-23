<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMetrics } from '../composables/useMetrics.js'
import { useDashboardData } from '../composables/useDashboardData.js'
import { useSavedViews } from '../composables/useSavedViews.js'
import { filterFromQuery, filterToQuery, stripFilterKeys } from '../lib/filters.js'
import RecoveryQueueTable from '../components/RecoveryQueueTable.vue'
import SavedViewsBar from '../components/SavedViewsBar.vue'

const route = useRoute()
const router = useRouter()
const { queueRows, rows } = useMetrics()
const { selectedProjectId } = useDashboardData()
const { views, save, remove } = useSavedViews()

const filter = computed(() => filterFromQuery(route.query))
const tableRows = computed(() => queueRows(filter.value))

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
