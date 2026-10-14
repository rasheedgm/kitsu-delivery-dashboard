import { describe, it, expect } from 'vitest'
import { CLASS } from './format.js'
import {
  kpis,
  weeklyQuota,
  overdueSeverity,
  deliveryLoad,
  departments,
  statusMatrix,
  overdueQueue,
  queueRows,
  buildShotRows,
  excludeTaskTypes,
  excludeTaskTypesFromShots,
  deadline
} from './metrics.js'

// Fixed "today" = Wed 2026-09-09 (matches the reference dashboard snapshot).
const TODAY = new Date(2026, 8, 9)

function row(overrides = {}) {
  return {
    taskId: Math.random().toString(36),
    projectId: 'p1',
    projectName: 'Show A',
    shotId: 's1',
    shotName: 'SEW_009_0010',
    taskTypeId: 'tt1',
    taskTypeName: 'Compositing',
    statusId: 'st1',
    statusName: 'WIP',
    statusColor: '#000',
    klass: CLASS.WIP,
    dueDate: null,
    assignees: [],
    assigneeNames: [],
    ...overrides
  }
}

const d = (y, m, day) => new Date(y, m - 1, day)

describe('kpis', () => {
  const rows = [
    row({ klass: CLASS.WIP, dueDate: d(2026, 8, 20) }), // overdue
    row({ klass: CLASS.NOT_STARTED, dueDate: d(2026, 9, 9) }), // due today + not started
    row({ klass: CLASS.DONE, dueDate: d(2026, 8, 1) }), // done, not overdue
    row({ klass: CLASS.RETAKE, dueDate: d(2026, 9, 15) })
  ]

  it('counts overdue tasks that are not done', () => {
    expect(kpis(rows, TODAY, 10).overdue).toBe(1)
  })

  it('counts due-today and not-started', () => {
    const k = kpis(rows, TODAY, 10)
    expect(k.dueToday).toBe(1)
    expect(k.notStarted).toBe(1)
    expect(k.delivered).toBe(1)
    expect(k.retakes).toBe(1)
    expect(k.shotsInScope).toBe(10)
  })
})

describe('weeklyQuota', () => {
  it('uses tasks due in the current ISO week', () => {
    // ISO week of 2026-09-09 is Mon 09-07 .. Sun 09-13
    const rows = [
      row({ dueDate: d(2026, 9, 7), klass: CLASS.DONE }),
      row({ dueDate: d(2026, 9, 10), klass: CLASS.WIP }),
      row({ dueDate: d(2026, 9, 13), klass: CLASS.DONE }),
      row({ dueDate: d(2026, 9, 14), klass: CLASS.WIP }) // next week, excluded
    ]
    const q = weeklyQuota(rows, TODAY)
    expect(q.total).toBe(3)
    expect(q.done).toBe(2)
    expect(q.remaining).toBe(1)
    expect(q.pct).toBe(67)
  })
})

describe('overdueSeverity', () => {
  it('buckets overdue tasks by age', () => {
    const rows = [
      row({ dueDate: d(2026, 8, 19), klass: CLASS.WIP }), // 21 days late -> 15+
      row({ dueDate: d(2026, 8, 30), klass: CLASS.WIP }), // 10 days late -> 8-14
      row({ dueDate: d(2026, 9, 5), klass: CLASS.WIP }) // 4 days -> 0-7
    ]
    const s = overdueSeverity(rows, TODAY)
    expect(s.map((b) => b.count)).toEqual([1, 1, 1])
  })
})

describe('deliveryLoad', () => {
  it('returns a 7-day window starting today', () => {
    const rows = [
      row({ dueDate: d(2026, 9, 9) }),
      row({ dueDate: d(2026, 9, 9) }),
      row({ dueDate: d(2026, 9, 11) })
    ]
    const load = deliveryLoad(rows, TODAY)
    expect(load).toHaveLength(7)
    expect(load[0].count).toBe(2)
    expect(load[0].isToday).toBe(true)
    expect(load[2].count).toBe(1)
  })
})

describe('departments', () => {
  it('aggregates required / in-progress / done per task type', () => {
    const rows = [
      row({ taskTypeName: 'Compositing', klass: CLASS.WIP }),
      row({ taskTypeName: 'Compositing', klass: CLASS.DONE }),
      row({ taskTypeName: 'Compositing', klass: CLASS.NOT_STARTED }),
      row({ taskTypeName: 'Rotoscopy', klass: CLASS.WIP })
    ]
    const [comp, roto] = departments(rows)
    expect(comp.name).toBe('Compositing')
    expect(comp.required).toBe(3)
    expect(comp.inProgress).toBe(1)
    expect(comp.done).toBe(1)
    expect(comp.notStarted).toBe(1)
    expect(roto.required).toBe(1)
  })
})

describe('statusMatrix', () => {
  it('pivots task type against classification', () => {
    const rows = [
      row({ taskTypeName: 'Compositing', klass: CLASS.WIP }),
      row({ taskTypeName: 'Compositing', klass: CLASS.WIP }),
      row({ taskTypeName: 'Rotoscopy', klass: CLASS.DONE })
    ]
    const mx = statusMatrix(rows)
    expect(mx.cells.Compositing[CLASS.WIP]).toBe(2)
    expect(mx.rowTotals.Rotoscopy).toBe(1)
    expect(mx.grandTotal).toBe(3)
  })
})

describe('overdueQueue', () => {
  it('sorts by days late descending', () => {
    const rows = [
      row({ dueDate: d(2026, 9, 5), klass: CLASS.WIP }),
      row({ dueDate: d(2026, 8, 20), klass: CLASS.WIP })
    ]
    const q = overdueQueue(rows, TODAY)
    expect(q[0].daysLate).toBe(20)
    expect(q[1].daysLate).toBe(4)
  })
})

describe('queueRows', () => {
  const rows = [
    row({ shotName: 'A_0010', taskTypeName: 'Compositing', assigneeNames: ['Anees'], klass: CLASS.WIP, dueDate: d(2026, 8, 20) }), // overdue, 20d
    row({ shotName: 'A_0020', taskTypeName: 'Rotoscopy', assigneeNames: ['Syamlu'], klass: CLASS.NOT_STARTED, dueDate: d(2026, 9, 9) }), // due today
    row({ shotName: 'A_0030', taskTypeName: 'Compositing', assigneeNames: [], klass: CLASS.DONE, dueDate: d(2026, 9, 1) }), // done, not overdue
    row({ shotName: 'A_0040', taskTypeName: 'Compositing', assigneeNames: ['Anees'], klass: CLASS.WIP, dueDate: d(2026, 9, 20) }) // future
  ]

  it('defaults to any due date, sorted by due date ascending (an empty filter is not "overdue")', () => {
    const q = queueRows(rows, {}, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0010', 'A_0030', 'A_0020', 'A_0040'])
  })

  it('due "overdue" must be requested explicitly, and sorts by days late descending', () => {
    const q = queueRows(rows, { due: 'overdue' }, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0010'])
  })

  it('filters by status regardless of due date when due is "all"', () => {
    const q = queueRows(rows, { due: 'all', status: CLASS.DONE }, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0030'])
  })

  it('filters by department', () => {
    const q = queueRows(rows, { due: 'all', dept: 'Rotoscopy' }, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0020'])
  })

  it('filters by artist, falling back to "Unassigned"', () => {
    const q = queueRows(rows, { due: 'all', artist: 'Anees' }, TODAY)
    expect(q.map((r) => r.shot).sort()).toEqual(['A_0010', 'A_0040'])
    const unassigned = queueRows(rows, { due: 'all', artist: 'Unassigned' }, TODAY)
    expect(unassigned.map((r) => r.shot)).toEqual(['A_0030'])
  })

  it('filters "today" and an exact ISO date the same way', () => {
    expect(queueRows(rows, { due: 'today' }, TODAY).map((r) => r.shot)).toEqual(['A_0020'])
    expect(queueRows(rows, { due: '2026-09-09' }, TODAY).map((r) => r.shot)).toEqual(['A_0020'])
  })

  it('matches free-text search across shot, dept and artist', () => {
    const q = queueRows(rows, { due: 'all', q: 'compositing' }, TODAY)
    expect(q.map((r) => r.shot).sort()).toEqual(['A_0010', 'A_0030', 'A_0040'])
  })

  it('sorts a non-overdue view by due date ascending', () => {
    const q = queueRows(rows, { due: 'all' }, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0010', 'A_0030', 'A_0020', 'A_0040'])
  })
})

describe('buildShotRows', () => {
  const settings = (over = {}) => ({
    shotStatusTaskTypeId: null,
    deliveredStatusIds: [],
    retakeStatusIds: [],
    ...over
  })

  const shots = [
    {
      shotId: 's1',
      projectId: 'p1',
      projectName: 'Show A',
      shotName: 'A_0010',
      tasks: [
        row({
          taskTypeId: 'tt_roto',
          taskTypeName: 'Rotoscopy',
          statusId: 'st_done',
          klass: CLASS.DONE,
          dueDate: d(2026, 8, 1)
        }),
        row({
          taskTypeId: 'tt_comp',
          taskTypeName: 'Compositing',
          statusId: 'st_wip',
          klass: CLASS.WIP,
          dueDate: d(2026, 9, 15)
        })
      ]
    },
    { shotId: 's2', projectId: 'p1', projectName: 'Show A', shotName: 'A_0020', tasks: [] }
  ]

  it('falls back to the latest-due task when no task type is configured', () => {
    const rows = buildShotRows(shots, settings())
    expect(rows[0].taskTypeName).toBe('Compositing')
    expect(rows[0].klass).toBe(CLASS.WIP)
  })

  it('a shot with no tasks yet is "not started" with no due date', () => {
    const rows = buildShotRows(shots, settings())
    expect(rows[1].klass).toBe(CLASS.NOT_STARTED)
    expect(rows[1].dueDate).toBeNull()
  })

  it('uses the configured task type when set', () => {
    const rows = buildShotRows(shots, settings({ shotStatusTaskTypeId: 'tt_roto' }))
    expect(rows[0].taskTypeName).toBe('Rotoscopy')
    expect(rows[0].klass).toBe(CLASS.DONE)
  })

  it('a shot with no task of the configured type counts as not started', () => {
    const rows = buildShotRows(shots, settings({ shotStatusTaskTypeId: 'tt_paint' }))
    expect(rows[0].klass).toBe(CLASS.NOT_STARTED)
  })

  it('explicit delivered/retake status ids override the flag-based classification', () => {
    const rows = buildShotRows(
      shots,
      settings({ shotStatusTaskTypeId: 'tt_comp', deliveredStatusIds: ['st_wip'] })
    )
    expect(rows[0].klass).toBe(CLASS.DONE)
  })
})

describe('deadline', () => {
  it('picks the nearest future production end date', () => {
    const projects = [
      { name: 'Past', end_date: '2026-01-01' },
      { name: 'Next', end_date: '2026-09-25' },
      { name: 'Later', end_date: '2026-12-01' }
    ]
    const dl = deadline(projects, TODAY)
    expect(dl.projectName).toBe('Next')
    expect(dl.daysLeft).toBe(16)
  })
})

describe('shot-scope queue (Shots overview drill-through)', () => {
  const settings = { shotStatusTaskTypeId: null, deliveredStatusIds: ['st_final'], retakeStatusIds: [] }
  // st_final is NOT flagged done in Kitsu (klass WIP) — only Settings makes it "delivered".
  const shots = [
    { shotId: 'a', projectId: 'p1', projectName: 'Show A', shotName: 'A_0010', tasks: [row({ shotId: 'a', shotName: 'A_0010', statusId: 'st_final', statusName: 'Final', klass: CLASS.WIP, dueDate: d(2026, 9, 1) })] },
    { shotId: 'b', projectId: 'p1', projectName: 'Show A', shotName: 'A_0020', tasks: [] },
    { shotId: 'c', projectId: 'p1', projectName: 'Show A', shotName: 'A_0030', tasks: [row({ shotId: 'c', shotName: 'A_0030', klass: CLASS.WIP, dueDate: d(2026, 9, 20) })] }
  ]
  const shotRows = buildShotRows(shots, settings)

  it('lists a shot delivered via Settings even though its task flag is not done', () => {
    const q = queueRows(shotRows, { status: CLASS.DONE }, TODAY)
    expect(q.map((r) => r.shot)).toEqual(['A_0010'])
    expect(kpis(shotRows, TODAY, shotRows.length).delivered).toBe(1)
  })

  it('lists a shot with no task yet under Not started, with a placeholder', () => {
    const q = queueRows(shotRows, { status: CLASS.NOT_STARTED }, TODAY)
    expect(q).toHaveLength(1)
    expect(q[0]).toMatchObject({ shot: 'A_0020', dept: '—', status: 'No task yet', due: '—' })
    expect(kpis(shotRows, TODAY, shotRows.length).notStarted).toBe(1)
  })

  it('every KPI count equals the length of the list its click opens', () => {
    const k = kpis(shotRows, TODAY, shotRows.length)
    expect(queueRows(shotRows, { status: CLASS.DONE }, TODAY)).toHaveLength(k.delivered)
    expect(queueRows(shotRows, { status: CLASS.NOT_STARTED }, TODAY)).toHaveLength(k.notStarted)
    expect(queueRows(shotRows, { due: 'overdue' }, TODAY)).toHaveLength(k.overdue)
  })
})

describe('excludeTaskTypes / excludeTaskTypesFromShots', () => {
  const rows = [
    row({ taskTypeId: 'tt_comp', taskTypeName: 'Compositing' }),
    row({ taskTypeId: 'tt_dummy', taskTypeName: 'Dummy' }),
    row({ taskTypeId: 'tt_dummy', taskTypeName: 'Dummy' })
  ]

  it('drops tasks of ignored types only', () => {
    expect(excludeTaskTypes(rows, ['tt_dummy']).map((r) => r.taskTypeName)).toEqual(['Compositing'])
  })

  it('is a no-op (same array) when nothing is ignored', () => {
    expect(excludeTaskTypes(rows, [])).toBe(rows)
  })

  it('keeps shots but removes their ignored tasks, so they cannot represent the shot', () => {
    const shots = [{ shotId: 'a', shotName: 'A_0010', tasks: [rows[0], { ...rows[1], dueDate: d(2026, 12, 1) }] }]
    const out = excludeTaskTypesFromShots(shots, ['tt_dummy'])
    expect(out).toHaveLength(1)
    expect(out[0].tasks.map((t) => t.taskTypeName)).toEqual(['Compositing'])
    // the dummy task had the latest due date — it must not become the shot's task
    expect(buildShotRows(out, { shotStatusTaskTypeId: null, deliveredStatusIds: [], retakeStatusIds: [] })[0].taskTypeName).toBe('Compositing')
  })
})
