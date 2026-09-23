import { describe, it, expect } from 'vitest'
import {
  UNASSIGNED_ID,
  weekStart,
  weekDays,
  shiftWeek,
  isSameWeek,
  buildScheduleGrid,
  computeMovePatch,
  dropAffectsOtherAssignees
} from './schedule.js'

const d = (y, m, day) => new Date(y, m - 1, day)

// Wed 2026-09-09 -> week is Mon 2026-09-07 .. Sun 2026-09-13
const WED = d(2026, 9, 9)

describe('weekStart / weekDays', () => {
  it('finds the Monday of the containing week', () => {
    expect(weekStart(WED).getDate()).toBe(7)
  })

  it('lists all 7 days Monday through Sunday', () => {
    const days = weekDays(weekStart(WED))
    expect(days).toHaveLength(7)
    expect(days[0].getDate()).toBe(7)
    expect(days[6].getDate()).toBe(13)
  })
})

describe('shiftWeek / isSameWeek', () => {
  it('shifts by whole weeks', () => {
    const next = shiftWeek(weekStart(WED), 1)
    expect(next.getDate()).toBe(14)
    const prev = shiftWeek(weekStart(WED), -1)
    expect(prev.getDate()).toBe(31) // August 31
  })

  it('recognizes two dates in the same week', () => {
    expect(isSameWeek(d(2026, 9, 7), d(2026, 9, 13))).toBe(true)
    expect(isSameWeek(d(2026, 9, 7), d(2026, 9, 14))).toBe(false)
  })
})

function task(overrides = {}) {
  return {
    taskId: Math.random().toString(36),
    shotName: 'A_0010',
    dueDate: null,
    assignees: [],
    assigneeNames: [],
    ...overrides
  }
}

describe('buildScheduleGrid', () => {
  const start = weekStart(WED) // Mon 09-07

  it('places a task on its assignee row and due-date column', () => {
    const rows = [task({ dueDate: d(2026, 9, 9), assignees: ['p1'], assigneeNames: ['Anees'] })]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].name).toBe('Anees')
    expect(grid.rows[0].cells['2026-09-09']).toHaveLength(1)
    expect(grid.rows[0].cells['2026-09-07']).toHaveLength(0)
  })

  it('a person with no task due this week gets no row at all', () => {
    const rows = [
      task({ dueDate: null, assignees: ['p1'], assigneeNames: ['Anees'] }),
      task({ dueDate: d(2026, 9, 20), assignees: ['p1'], assigneeNames: ['Anees'] }) // next week
    ]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows).toHaveLength(0)
  })

  it('puts unassigned tasks on a synthetic Unassigned row, sorted last', () => {
    const rows = [
      task({ dueDate: d(2026, 9, 8), assignees: [], assigneeNames: [] }),
      task({ dueDate: d(2026, 9, 8), assignees: ['p1'], assigneeNames: ['Zoe'] })
    ]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows.map((r) => r.name)).toEqual(['Zoe', 'Unassigned'])
  })

  it('a multi-assignee task appears on every assignee row', () => {
    const rows = [task({ dueDate: d(2026, 9, 9), assignees: ['p1', 'p2'], assigneeNames: ['Anees', 'Diego'] })]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows.map((r) => r.name).sort()).toEqual(['Anees', 'Diego'])
    for (const row of grid.rows) expect(row.cells['2026-09-09']).toHaveLength(1)
  })
})

describe('computeMovePatch', () => {
  it('is null for a drop on the same cell (no-op)', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p1', '2026-09-09')).toBeNull()
  })

  it('changes only due_date when the row is unchanged', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p1', '2026-09-10')).toEqual({ due_date: '2026-09-10' })
  })

  it('changes assignees to the single target person when the row changes', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p2', '2026-09-09')).toEqual({ assignees: ['p2'] })
  })

  it('clears assignees when dropped on the Unassigned row', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', UNASSIGNED_ID, '2026-09-09')).toEqual({ assignees: [] })
  })

  it('changes both fields when both the day and the row change', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p2', '2026-09-11')).toEqual({
      due_date: '2026-09-11',
      assignees: ['p2']
    })
  })
})

describe('dropAffectsOtherAssignees', () => {
  it('is false when the task has one assignee', () => {
    const t = task({ assignees: ['p1'] })
    expect(dropAffectsOtherAssignees(t, 'p1', 'p2')).toBe(false)
  })

  it('is false when the row does not change, even with several assignees', () => {
    const t = task({ assignees: ['p1', 'p2'] })
    expect(dropAffectsOtherAssignees(t, 'p1', 'p1')).toBe(false)
  })

  it('is true when a multi-assignee task is dropped on a different row', () => {
    const t = task({ assignees: ['p1', 'p2'] })
    expect(dropAffectsOtherAssignees(t, 'p1', 'p3')).toBe(true)
  })
})
