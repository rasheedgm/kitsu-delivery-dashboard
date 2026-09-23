import { computed, reactive, ref, watch } from 'vue'
import {
  getOpenProductions,
  getPersons,
  getSession,
  getShotsWithTasks,
  getTaskStatuses,
  getTaskTypes
} from '../api/kitsu.js'
import { classifyStatus, indexById, parseDate } from '../lib/format.js'
import { demoDataset } from '../lib/demoData.js'

const state = reactive({
  loading: false,
  loaded: false,
  loggedIn: true,
  isAdmin: false,
  error: null,
  studioName: null,
  projects: [],
  persons: [],
  taskTypes: [], // raw list, for the Settings screen's task-type picker
  taskStatuses: [], // raw list, for the Settings screen's status checklists
  rows: [], // one per shot task, across all open productions
  shots: [], // one per shot (incl. shots with zero tasks), each with .tasks
  shotCount: 0
})

// Remember the last production filter per browser — a small, free "settings"
// win that doesn't need any backend (see README's Kitsu-plugin-settings note).
const LAST_PROJECT_KEY = 'kitsu-delivery-dashboard:lastProjectId'

function restoreProjectId() {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY) || 'all'
  } catch {
    return 'all'
  }
}

const selectedProjectId = ref(restoreProjectId())

watch(selectedProjectId, (id) => {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id)
  } catch {
    // ignore — private browsing / blocked storage
  }
})

function personName(person) {
  const full = [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
  return full || person.full_name || person.email || 'Unknown'
}

// Group flat task rows into one entry per shot — used for the demo dataset,
// which (unlike the real fetch loop below) has no separate "zero-task shots"
// to seed ahead of time.
function groupRowsIntoShots(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.shotId)) {
      map.set(r.shotId, {
        shotId: r.shotId,
        projectId: r.projectId,
        projectName: r.projectName,
        shotName: r.shotName,
        tasks: []
      })
    }
    map.get(r.shotId).tasks.push(r)
  }
  return [...map.values()]
}

async function load() {
  if (state.loading) return
  state.loading = true
  state.error = null
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      const demo = demoDataset()
      Object.assign(state, {
        ...demo,
        shots: groupRowsIntoShots(demo.rows),
        loggedIn: true,
        isAdmin: true,
        loaded: true
      })
      return
    }

    const session = await getSession()
    state.loggedIn = session.loggedIn
    state.isAdmin = session.isAdmin
    state.studioName = session.studioName
    if (!state.loggedIn) return

    const [projects, persons, taskTypes, taskStatuses] = await Promise.all([
      getOpenProductions(),
      getPersons(),
      getTaskTypes(),
      getTaskStatuses()
    ])

    const typeById = indexById(taskTypes)
    const statusById = indexById(taskStatuses)
    const personById = indexById(persons)

    state.projects = projects || []
    state.persons = persons || []
    state.taskTypes = taskTypes || []
    state.taskStatuses = taskStatuses || []

    const rows = []
    const shots = []
    let shotCount = 0

    const shotLists = await Promise.all(
      state.projects.map((p) =>
        getShotsWithTasks(p.id)
          .then((shots) => ({ project: p, shots: shots || [] }))
          .catch(() => ({ project: p, shots: [] }))
      )
    )

    for (const { project, shots: projectShots } of shotLists) {
      for (const shot of projectShots) {
        if (shot.canceled) continue
        shotCount += 1
        const shotName = [shot.sequence_name, shot.name].filter(Boolean).join(' / ') || shot.name
        const shotEntry = {
          shotId: shot.id,
          projectId: project.id,
          projectName: project.name,
          shotName,
          tasks: []
        }
        shots.push(shotEntry)

        for (const task of shot.tasks || []) {
          const status = statusById[task.task_status_id]
          const type = typeById[task.task_type_id]
          const assignees = task.assignees || []
          const row = {
            taskId: task.id,
            projectId: project.id,
            projectName: project.name,
            shotId: shot.id,
            shotName,
            taskTypeId: task.task_type_id,
            taskTypeName: type ? type.name : 'Unknown',
            statusId: task.task_status_id,
            statusName: status ? status.short_name || status.name : 'Unknown',
            statusColor: status ? status.color : '#999',
            klass: classifyStatus(status),
            dueDate: parseDate(task.due_date || task.end_date),
            assignees,
            assigneeNames: assignees
              .map((id) => (personById[id] ? personName(personById[id]) : null))
              .filter(Boolean)
          }
          rows.push(row)
          shotEntry.tasks.push(row)
        }
      }
    }

    state.rows = rows
    state.shots = shots
    state.shotCount = shotCount
    state.loaded = true

    // A remembered production that no longer exists (deleted/closed since the
    // last visit) shouldn't leave the dashboard silently empty.
    if (selectedProjectId.value !== 'all' && !state.projects.some((p) => p.id === selectedProjectId.value)) {
      selectedProjectId.value = 'all'
    }
  } catch (err) {
    state.error = err?.message || String(err)
  } finally {
    state.loading = false
  }
}

export function useDashboardData() {
  const filteredRows = computed(() =>
    selectedProjectId.value === 'all'
      ? state.rows
      : state.rows.filter((r) => r.projectId === selectedProjectId.value)
  )

  const filteredShots = computed(() =>
    selectedProjectId.value === 'all'
      ? state.shots
      : state.shots.filter((s) => s.projectId === selectedProjectId.value)
  )

  const filteredProjects = computed(() =>
    selectedProjectId.value === 'all'
      ? state.projects
      : state.projects.filter((p) => p.id === selectedProjectId.value)
  )

  const filteredShotCount = computed(() => filteredShots.value.length)

  return {
    state,
    load,
    selectedProjectId,
    filteredRows,
    filteredShots,
    filteredProjects,
    filteredShotCount
  }
}
