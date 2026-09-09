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
async function request(path, { optional = false } = {}) {
  const res = await getClient().api.get(path)
  if (!res.ok) {
    if (optional) return null
    const detail =
      (res.data && (res.data.message || res.data.error)) ||
      res.problem ||
      `HTTP ${res.status ?? '???'}`
    throw new Error(`GET ${path} — ${detail}`)
  }
  return res.data
}

function asList(data, path) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.data)) return data.data // paginated shape
  throw new Error(`GET ${path} returned ${data === null ? 'null' : typeof data}, expected a list`)
}

export async function checkLogin() {
  try {
    const res = await getClient().api.get('auth/authenticated')
    return !!res.ok
  } catch (err) {
    return false
  }
}

export async function getOpenProductions() {
  return asList(await request('/data/projects/open'), '/data/projects/open')
}

// Studio name, from the (single) organisation record. Readable by any user.
export async function getStudioName() {
  const data = await request('/data/organisations', { optional: true })
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  const name = list[0]?.name?.trim()
  return name || null
}

export async function getPersons() {
  return asList(await request('/data/persons'), '/data/persons')
}

// Task types and task statuses are studio-global in Kitsu.
export async function getTaskTypes() {
  return asList(await request('/data/task-types'), '/data/task-types')
}

export async function getTaskStatuses() {
  return asList(await request('/data/task-status'), '/data/task-status')
}

// One call per production: shot names + every shot task with dates, status,
// type and assignees embedded. Returns [] if a single production errors.
// Zou route is /data/shots/with-tasks with project_id as a query param.
export async function getShotsWithTasks(projectId) {
  const data = await request(
    `/data/shots/with-tasks?project_id=${encodeURIComponent(projectId)}`,
    { optional: true }
  )
  return Array.isArray(data) ? data : []
}
