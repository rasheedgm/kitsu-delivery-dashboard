import { reactive } from 'vue'
import { getPluginSettings, savePluginSettings } from '../api/kitsu.js'

// Studio-wide settings, shared by everyone who opens the dashboard (backed by
// this plugin's own /settings endpoint — see README's "Kitsu has no
// plugin-settings framework" section for why that backend exists at all).
const DEFAULTS = {
  shotStatusTaskTypeId: null,
  deliveredStatusIds: [],
  retakeStatusIds: []
}

const state = reactive({
  loading: false,
  loaded: false,
  error: null,
  saving: false,
  ...DEFAULTS
})

function fromApi(data) {
  return {
    shotStatusTaskTypeId: data?.shot_status_task_type_id || null,
    deliveredStatusIds: Array.isArray(data?.delivered_status_ids) ? data.delivered_status_ids : [],
    retakeStatusIds: Array.isArray(data?.retake_status_ids) ? data.retake_status_ids : []
  }
}

function toApi(patch) {
  const out = {}
  if ('shotStatusTaskTypeId' in patch) out.shot_status_task_type_id = patch.shotStatusTaskTypeId || null
  if ('deliveredStatusIds' in patch) out.delivered_status_ids = patch.deliveredStatusIds || []
  if ('retakeStatusIds' in patch) out.retake_status_ids = patch.retakeStatusIds || []
  return out
}

async function load() {
  if (state.loading) return
  state.loading = true
  state.error = null
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      // A plausible pre-configured example so the shots-overview feature is
      // visible in the demo preview without a backend.
      Object.assign(state, {
        shotStatusTaskTypeId: 'tt_comp',
        deliveredStatusIds: ['st_done'],
        retakeStatusIds: ['st_retake', 'st_crtk']
      })
      state.loaded = true
      return
    }
    const data = await getPluginSettings()
    Object.assign(state, fromApi(data))
    state.loaded = true
  } catch (err) {
    // A studio that hasn't updated the backend yet (older plugin version, or
    // the migration hasn't run) will 404/500 here — fall back to defaults so
    // the rest of the dashboard keeps working, just unconfigured.
    state.error = err?.message || String(err)
    state.loaded = true
  } finally {
    state.loading = false
  }
}

async function save(patch) {
  state.saving = true
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      Object.assign(state, patch) // simulate a save locally, no backend in demo mode
      return
    }
    const data = await savePluginSettings(toApi(patch))
    Object.assign(state, fromApi(data))
  } finally {
    state.saving = false
  }
}

export function useSettings() {
  return { state, load, save }
}
