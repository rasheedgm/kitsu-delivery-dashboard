<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDashboardData } from './composables/useDashboardData.js'
import { useSettings } from './composables/useSettings.js'
import { useSchedule } from './composables/useSchedule.js'

const route = useRoute()
const router = useRouter()
const { state, load, selectedProjectId, filteredProjects } = useDashboardData()
const { load: loadSettings } = useSettings()
const { pendingCount } = useSchedule()

const tabs = [
  { to: '/', label: 'Overview' },
  { to: '/production', label: 'Production' },
  { to: '/tasks', label: 'Task queue' },
  { to: '/schedule', label: 'Schedule' }
]

// The schedule board groups tasks by person across whatever's in scope — with
// every open production mixed together, a person's row would interleave work
// from unrelated shows with no way to tell them apart. Require a single
// production instead of hiding the tab outright, so it's still discoverable
// and the reason it's disabled is visible right on it.
const scheduleNeedsProject = computed(() => selectedProjectId.value === 'all')

// Covers both switching the dropdown to "All" while already on the board,
// and landing straight on #/schedule (a bookmark, a restored tab) when "All"
// is the remembered production.
watch(
  () => [route.path, scheduleNeedsProject.value],
  ([path, needs]) => {
    if (path === '/schedule' && needs) router.replace('/')
  },
  { immediate: true }
)

function goTab(to) {
  if (to === '/schedule' && scheduleNeedsProject.value) return
  router.push({ path: to, query: route.query })
}

const lastUpdated = computed(() =>
  new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
)

const heading = computed(() =>
  state.studioName ? `${state.studioName} Dashboard` : 'Dashboard'
)

const logoText = computed(() => {
  const words = heading.value.split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
})

watch(heading, (value) => { document.title = value }, { immediate: true })

function applyTheme(value) {
  const dark = value === true || value === 'true' || value === '1'
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

// Kitsu may deliver `dark_theme` on the real query string (captured into the
// hash route by the router guard) or asynchronously via postMessage. Read both
// the hash route and the original URL, and keep watching the route.
function currentThemeParam() {
  return (
    route.query.dark_theme ??
    new URLSearchParams(window.location.search).get('dark_theme')
  )
}

watch(() => route.query.dark_theme, () => applyTheme(currentThemeParam()), { immediate: true })

function onMessage(event) {
  const data = event.data || {}
  if (data.type === 'theme' || 'dark_theme' in data) {
    applyTheme(data.dark_theme ?? data.value ?? data.theme === 'dark')
  }
}

onMounted(() => {
  applyTheme(currentThemeParam())
  window.addEventListener('message', onMessage)
  load()
  loadSettings()
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <div class="shell">
    <header class="top">
      <div class="brand">
        <div class="logo">{{ logoText }}</div>
        <h1>{{ heading }}</h1>
      </div>
      <div class="topRight">
        <select v-model="selectedProjectId" class="prodSelect" :disabled="!state.loaded">
          <option value="all">All open productions ({{ state.projects.length }})</option>
          <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <div class="meta">
          PRODUCTIONS <b>{{ filteredProjects.length }}</b><br>
          UPDATED <b>{{ lastUpdated }}</b>
        </div>
        <button
          type="button"
          class="settingsBtn"
          :class="{ active: route.path === '/settings' }"
          title="Settings"
          @click="router.push({ path: '/settings', query: route.query })"
        >⚙</button>
      </div>
    </header>

    <div v-if="state.loading && !state.loaded" class="state">Loading Kitsu data…</div>
    <div v-else-if="!state.loggedIn" class="state">
      Please sign in to Kitsu in the main window, then reload this page.
    </div>
    <div v-else-if="state.error" class="state err">Failed to load: {{ state.error }}</div>
    <div v-else-if="state.loaded && state.rows.length === 0" class="state">
      No shot tasks found in the open productions.
    </div>

    <template v-else-if="state.loaded">
      <nav class="tabs">
        <button
          v-for="t in tabs"
          :key="t.to"
          class="tab"
          :class="{ active: route.path === t.to, disabled: t.to === '/schedule' && scheduleNeedsProject }"
          :title="t.to === '/schedule' && scheduleNeedsProject ? 'Pick a single production above to use the Schedule board' : ''"
          @click="goTab(t.to)"
        >{{ t.label }}<span v-if="t.to === '/schedule' && pendingCount" class="tabBadge">{{ pendingCount }}</span></button>
      </nav>
      <router-view />
      <div class="footer">Studio Dashboard · Kitsu plugin · v0.4.2</div>
    </template>
  </div>
</template>
