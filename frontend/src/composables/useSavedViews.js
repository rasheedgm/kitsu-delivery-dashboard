import { ref } from 'vue'

// Saved views are per-browser (localStorage), not shared across the team —
// Kitsu's plugin system has no shared settings store to put them in (see
// README). A saved view captures: which tab, the Delivery Queue filter (as a
// route-query-shaped object), and the selected production.
const STORAGE_KEY = 'kitsu-delivery-dashboard:views'

function safeParse(json) {
  try {
    const data = JSON.parse(json)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function load() {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return [] // localStorage can throw (private mode, blocked storage, …)
  }
}

function persist(views) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // best-effort only — a saved view is a convenience, not critical state
  }
}

const views = ref(load())

export function useSavedViews() {
  function save(name, { tab, query, projectId }) {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      tab,
      query: { ...query },
      projectId
    }
    views.value = [...views.value, entry]
    persist(views.value)
    return entry
  }

  function remove(id) {
    views.value = views.value.filter((v) => v.id !== id)
    persist(views.value)
  }

  return { views, save, remove }
}
