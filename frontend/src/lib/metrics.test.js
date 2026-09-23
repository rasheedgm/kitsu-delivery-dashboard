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

  it('defaults to overdue, sorted by days late descending', () => {
    const q = queueRows(rows, {}, TODAY)
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
