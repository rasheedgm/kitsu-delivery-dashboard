// Synthetic data for previewing the dashboard without a Kitsu server.
// Enabled with ?demo=1 on the URL.

import { parseDate, classifyStatus } from './format.js'

const STATUSES = [
  { id: 'st_todo', name: 'Todo', short_name: 'todo', color: '#999', is_default: true },
  { id: 'st_wip', name: 'Work In Progress', short_name: 'wip', color: '#b47717' },
  { id: 'st_retake', name: 'Retake', short_name: 'retake', color: '#477bb8', is_retake: true },
  { id: 'st_crtk', name: 'Client Retake', short_name: 'crtk', color: '#7259b8', is_retake: true },
  { id: 'st_done', name: 'Done', short_name: 'done', color: '#218568', is_done: true }
]

const TYPES = [
  { id: 'tt_roto', name: 'Rotoscopy' },
  { id: 'tt_paint', name: 'Paint Prep' },
  { id: 'tt_mm', name: 'Matchmove' },
  { id: 'tt_comp', name: 'Compositing' }
]

const PERSONS = [
  ['p_anees', 'Anees', 'K'],
  ['p_syamlu', 'Syamlu', 'R'],
  ['p_nelson', 'Nelson', 'D'],
  ['p_anil', 'Anil', 'M'],
  ['p_joshi', 'Joshi', 'P']
].map(([id, first_name, last_name]) => ({ id, first_name, last_name }))

function iso(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Deterministic pseudo-random from a seed.
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function buildShots(prefix, count, seed) {
  const rand = rng(seed)
  const shots = []
  for (let i = 1; i <= count; i += 1) {
    const num = String(i * 10).padStart(4, '0')
    const tasks = TYPES.filter((_, idx) => idx === 3 || rand() > 0.55).map((type) => {
      const st = STATUSES[Math.floor(rand() * STATUSES.length)]
      const due = iso(Math.floor(rand() * 40) - 25)
      return {
        id: `${prefix}_${num}_${type.id}`,
        task_type_id: type.id,
        task_status_id: st.id,
        due_date: due,
        assignees: [PERSONS[Math.floor(rand() * PERSONS.length)].id]
      }
    })
    shots.push({ id: `${prefix}_${num}`, name: `${prefix}_${num}`, sequence_name: prefix, tasks })
  }
  return shots
}

export function demoDataset() {
  const projects = [
    { id: 'prj_sew', name: 'Sewing Machine', end_date: iso(16) },
    { id: 'prj_orbit', name: 'Orbit', end_date: iso(60) }
  ]
  const shotsByProject = {
    prj_sew: buildShots('SEW_009', 28, 7),
    prj_orbit: buildShots('ORB_004', 14, 42)
  }

  const typeById = Object.fromEntries(TYPES.map((t) => [t.id, t]))
  const statusById = Object.fromEntries(STATUSES.map((s) => [s.id, s]))
  const personById = Object.fromEntries(PERSONS.map((p) => [p.id, p]))

  const rows = []
  let shotCount = 0
  for (const project of projects) {
    for (const shot of shotsByProject[project.id]) {
      shotCount += 1
      for (const task of shot.tasks) {
        const status = statusById[task.task_status_id]
        rows.push({
          taskId: task.id,
          projectId: project.id,
          projectName: project.name,
          shotId: shot.id,
          shotName: `${shot.sequence_name} / ${shot.name}`,
          taskTypeId: task.task_type_id,
          taskTypeName: typeById[task.task_type_id].name,
          statusId: status.id,
          statusName: status.short_name,
          statusColor: status.color,
          klass: classifyStatus(status),
          dueDate: parseDate(task.due_date),
          assignees: task.assignees,
          assigneeNames: task.assignees.map((id) => personById[id].first_name)
        })
      }
    }
  }
  return { studioName: 'Demo Studio', projects, persons: PERSONS, rows, shotCount }
}
