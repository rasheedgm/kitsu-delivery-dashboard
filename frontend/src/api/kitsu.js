import kitsuClient from 'kitsu-client-js'

// The plugin runs same-origin inside the Kitsu iframe, so Zou's JWT cookie is
// sent automatically with every /api request — no explicit login needed here.
let client = null

function getClient() {
  if (!client) client = kitsuClient.createClient('/api')
  return client
}

// kitsu-client-js is built on apisauce, which never rejects: a failed request
// resolves with { ok: false, data: <error body> }. Go through the raw apisauce
// instance so we can detect failures and Zou's `{ error, message }` payloads
// instead of trying to iterate an error object downstream.
async function request(method, path, body, { optional = false } = {}) {
  const api = getClient().api
  const res = method === 'put' ? await api.put(path, body) : await api.get(path)
  if (!res.ok) {
    if (optional) return null
    const detail =
      (res.data && (res.data.message || res.data.error)) ||
      res.problem ||
      `HTTP ${res.status ?? '???'}`
    throw new Error(`${method.toUpperCase()} ${path} — ${detail}`)
  }
  return res.data
}

const get = (path, opts) => request('get', path, undefined, opts)
const put = (path, body, opts) => request('put', path, body, opts)

function asList(data, path) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data // paginated shape
  throw new Error(`GET ${path} returned ${data === null ? 'null' : typeof data}, expected a list`)
}

// Session info in one call: is the user logged in, who they are (for the
// admin-only settings gate), and the studio's organisation (page heading).
export async function getSession() {
  const data = await get('auth/authenticated', { optional: true })
  if (!data) return { loggedIn: false, isAdmin: false, studioName: null }
  return {
    loggedIn: true,
    isAdmin: data.user?.role === 'admin',
    studioName: data.organisation?.name?.trim() || null
  }
}

export async function getOpenProductions() {
  return asList(await get('/data/projects/open'), '/data/projects/open')
}

export async function getPersons() {
  return asList(await get('/data/persons'), '/data/persons')
}

// Task types and task statuses are studio-global in Kitsu.
export async function getTaskTypes() {
  return asList(await get('/data/task-types'), '/data/task-types')
}

export async function getTaskStatuses() {
  return asList(await get('/data/task-status'), '/data/task-status')
}

// One call per production: shot names + every shot task with dates, status,
// type and assignees embedded. Returns [] if a single production errors.
// Zou route is /data/shots/with-tasks with project_id as a query param.
export async function getShotsWithTasks(projectId) {
  const data = await get(
    `/data/shots/with-tasks?project_id=${encodeURIComponent(projectId)}`,
    { optional: true }
  )
  return Array.isArray(data) ? data : []
}

// Studio-wide dashboard settings (this plugin's own backend — see README).
export async function getPluginSettings() {
  return get('/plugins/delivery_dashboard/settings', { optional: true })
}

export async function savePluginSettings(patch) {
  return put('/plugins/delivery_dashboard/settings', patch)
}
