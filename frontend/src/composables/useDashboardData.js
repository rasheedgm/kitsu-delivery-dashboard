import { computed, reactive, ref } from 'vue'
import {
  checkLogin,
  getOpenProductions,
  getPersons,
  getShotsWithTasks,
  getStudioName,
  getTaskStatuses,
  getTaskTypes
} from '../api/kitsu.js'
import { classifyStatus, indexById, parseDate } from '../lib/format.js'
import { demoDataset } from '../lib/demoData.js'

const state = reactive({
  loading: false,
  loaded: false,
  loggedIn: true,
  error: null,
  studioName: null,
  projects: [],
  persons: [],
  rows: [], // one per shot task, across all open productions
  shotCount: 0
})

const selectedProjectId = ref('all')

function personName(person) {
  const full = [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
  return full || person.full_name || person.email || 'Unknown'
}

async function load() {
  if (state.loading) return
  state.loading = true
  state.error = null
  try {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      const demo = demoDataset()
      Object.assign(state, { ...demo, loggedIn: true, loaded: true })
      return
    }

    state.loggedIn = await checkLogin()
    if (!state.loggedIn) return

    const [projects, persons, taskTypes, taskStatuses, studioName] = await Promise.all([
      getOpenProductions(),
      getPersons(),
      getTaskTypes(),
      getTaskStatuses(),
      getStudioName().catch(() => null)
    ])

    state.studioName = studioName

    const typeById = indexById(taskTypes)
    const statusById = indexById(taskStatuses)
    const personById = indexById(persons)

    state.projects = projects || []
    state.persons = persons || []

    const rows = []
    let shotCount = 0

    const shotLists = await Promise.all(
      state.projects.map((p) =>
        getShotsWithTasks(p.id)
          .then((shots) => ({ project: p, shots: shots || [] }))
          .catch(() => ({ project: p, shots: [] }))
      )
    )

    for (const { project, shots } of shotLists) {
      for (const shot of shots) {
        if (shot.canceled) continue
        shotCount += 1
        for (const task of shot.tasks || []) {
          const status = statusById[task.task_status_id]
          const type = typeById[task.task_type_id]
          const assignees = task.assignees || []
          rows.push({
            taskId: task.id,
            projectId: project.id,
            projectName: project.name,
            shotId: shot.id,
            shotName: [shot.sequence_name, shot.name].filter(Boolean).join(' / ') || shot.name,
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
          })
        }
      }
    }

    state.rows = rows
    state.shotCount = shotCount
    state.loaded = true
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

  const filteredProjects = computed(() =>
    selectedProjectId.value === 'all'
      ? state.projects
      : state.projects.filter((p) => p.id === selectedProjectId.value)
  )

  const filteredShotCount = computed(() => {
    if (selectedProjectId.value === 'all') return state.shotCount
    return new Set(filteredRows.value.map((r) => r.shotId)).size
  })

  return {
    state,
    load,
    selectedProjectId,
    filteredRows,
    filteredProjects,
    filteredShotCount
  }
}
