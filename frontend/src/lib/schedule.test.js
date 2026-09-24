import { describe, it, expect } from 'vitest'
import {
  UNASSIGNED_ID,
  weekStart,
  weekDays,
  shiftWeek,
  isSameWeek,
  buildScheduleGrid,
  computeMovePatch,
  computeStartPatch,
  computeDatesPatch,
  startAfterDue,
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
    startDate: null,
    assignees: [],
    assigneeNames: [],
    ...overrides
  }
}

describe('buildScheduleGrid', () => {
  const start = weekStart(WED) // Mon 09-07

  it('places a task on its assignee row and due-date column as a real (non-ghost) card', () => {
    const rows = [task({ dueDate: d(2026, 9, 9), assignees: ['p1'], assigneeNames: ['Anees'] })]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].name).toBe('Anees')
    expect(grid.rows[0].cells['2026-09-09']).toEqual([{ task: rows[0], ghost: false }])
    expect(grid.rows[0].cells['2026-09-07']).toHaveLength(0)
  })

  it('a person with no task touching this week gets no row at all', () => {
    const rows = [
      task({ dueDate: null, assignees: ['p1'], assigneeNames: ['Anees'] }),
      task({ dueDate: d(2026, 9, 20), assignees: ['p1'], assigneeNames: ['Anees'] }) // next week, no start_date
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

  it('fills a ghost trail from start_date up to (not including) due_date', () => {
    const rows = [
      task({ startDate: d(2026, 9, 7), dueDate: d(2026, 9, 10), assignees: ['p1'], assigneeNames: ['Anees'] })
    ]
    const grid = buildScheduleGrid(rows, start)
    const cells = grid.rows[0].cells
    expect(cells['2026-09-07']).toEqual([{ task: rows[0], ghost: true, isStart: true }]) // leading edge
    expect(cells['2026-09-08']).toEqual([{ task: rows[0], ghost: true }])
    expect(cells['2026-09-09']).toEqual([{ task: rows[0], ghost: true }])
    expect(cells['2026-09-10']).toEqual([{ task: rows[0], ghost: false }]) // due date: real card, not a ghost too
  })

  it('shows a ghost trail even in a week where the due date itself is not visible', () => {
    const rows = [
      task({ startDate: d(2026, 9, 12), dueDate: d(2026, 9, 20), assignees: ['p1'], assigneeNames: ['Anees'] })
    ]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].cells['2026-09-12']).toEqual([{ task: rows[0], ghost: true, isStart: true }])
    expect(grid.rows[0].cells['2026-09-13']).toEqual([{ task: rows[0], ghost: true }])
  })

  it('marks no ghost as the start handle when start_date is in an earlier week', () => {
    const rows = [
      task({ startDate: d(2026, 9, 3), dueDate: d(2026, 9, 10), assignees: ['p1'], assigneeNames: ['Anees'] })
    ]
    const cells = buildScheduleGrid(rows, start).rows[0].cells
    expect(cells['2026-09-07']).toEqual([{ task: rows[0], ghost: true }])
    expect(Object.values(cells).flat().some((e) => e.isStart)).toBe(false)
  })

  it('no ghost trail when start_date is on or after due_date', () => {
    const rows = [task({ startDate: d(2026, 9, 9), dueDate: d(2026, 9, 9), assignees: ['p1'], assigneeNames: ['Anees'] })]
    const grid = buildScheduleGrid(rows, start)
    expect(grid.rows[0].cells['2026-09-09']).toHaveLength(1)
    expect(grid.rows[0].cells['2026-09-09'][0].ghost).toBe(false)
  })

  it('pinned persons get an empty row even with no tasks this week', () => {
    const grid = buildScheduleGrid([], start, [{ id: 'p9', name: 'Priya' }])
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].name).toBe('Priya')
    expect(Object.values(grid.rows[0].cells).flat()).toHaveLength(0)
  })

  it('a pinned person who also has real tasks just gets the one row', () => {
    const rows = [task({ dueDate: d(2026, 9, 9), assignees: ['p1'], assigneeNames: ['Anees'] })]
    const grid = buildScheduleGrid(rows, start, [{ id: 'p1', name: 'Anees' }])
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0].cells['2026-09-09']).toHaveLength(1)
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

describe('computeMovePatch on a multi-assignee task', () => {
  const t = () => task({ dueDate: d(2026, 9, 9), assignees: ['p1', 'p2'] })

  it('swaps only the row it was dragged from, keeping the co-assignee', () => {
    expect(computeMovePatch(t(), 'p1', 'p3', '2026-09-09')).toEqual({ assignees: ['p3', 'p2'] })
    expect(computeMovePatch(t(), 'p2', 'p3', '2026-09-09')).toEqual({ assignees: ['p1', 'p3'] })
  })

  it('just drops the source when the target is already a co-assignee', () => {
    expect(computeMovePatch(t(), 'p1', 'p2', '2026-09-09')).toEqual({ assignees: ['p2'] })
  })

  it('removes only the source when dropped on Unassigned', () => {
    expect(computeMovePatch(t(), 'p1', UNASSIGNED_ID, '2026-09-09')).toEqual({ assignees: ['p2'] })
  })

  it('replaceAll makes the target the only assignee', () => {
    expect(computeMovePatch(t(), 'p1', 'p3', '2026-09-09', { replaceAll: true })).toEqual({ assignees: ['p3'] })
  })
})

describe('computeMovePatch keeps the task duration', () => {
  it('shifts start_date by the same amount as due_date', () => {
    const t = task({ startDate: d(2026, 9, 7), dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p1', '2026-09-14')).toEqual({
      due_date: '2026-09-14',
      start_date: '2026-09-12'
    })
  })

  it('leaves start_date alone when the task has none', () => {
    const t = task({ dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p1', '2026-09-14')).toEqual({ due_date: '2026-09-14' })
  })

  it('does not touch start_date on a reassign-only drop', () => {
    const t = task({ startDate: d(2026, 9, 7), dueDate: d(2026, 9, 9), assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p2', '2026-09-09')).toEqual({ assignees: ['p2'] })
  })

  it('clamps start_date to the new due date when scheduling a task that had no due date', () => {
    const t = task({ startDate: d(2026, 9, 20), dueDate: null, assignees: ['p1'] })
    expect(computeMovePatch(t, 'p1', 'p1', '2026-09-10')).toEqual({
      due_date: '2026-09-10',
      start_date: '2026-09-10'
    })
  })
})

describe('computeStartPatch', () => {
  const t = () => task({ startDate: d(2026, 9, 7), dueDate: d(2026, 9, 10) })

  it('sets start_date only', () => {
    expect(computeStartPatch(t(), '2026-09-08')).toEqual({ start_date: '2026-09-08' })
  })

  it('is null for the same day', () => {
    expect(computeStartPatch(t(), '2026-09-07')).toBeNull()
  })

  it('allows start == due (collapses the trail)', () => {
    expect(computeStartPatch(t(), '2026-09-10')).toEqual({ start_date: '2026-09-10' })
  })

  it('is null, and flagged by startAfterDue, when after the due date', () => {
    expect(computeStartPatch(t(), '2026-09-11')).toBeNull()
    expect(startAfterDue(t(), '2026-09-11')).toBe(true)
    expect(startAfterDue(t(), '2026-09-10')).toBe(false)
  })
})

describe('computeDatesPatch', () => {
  const t = () => task({ startDate: d(2026, 9, 7), dueDate: d(2026, 9, 10) })

  it('requires a due date', () => {
    expect(computeDatesPatch(t(), '2026-09-07', '').error).toBeTruthy()
  })

  it('rejects a start after the due date', () => {
    expect(computeDatesPatch(t(), '2026-09-12', '2026-09-10').error).toBeTruthy()
  })

  it('returns only the changed fields', () => {
    expect(computeDatesPatch(t(), '2026-09-08', '2026-09-10')).toEqual({ patch: { start_date: '2026-09-08' } })
    expect(computeDatesPatch(t(), '2026-09-07', '2026-09-12')).toEqual({ patch: { due_date: '2026-09-12' } })
  })

  it('clears the start date with an empty value', () => {
    expect(computeDatesPatch(t(), '', '2026-09-10')).toEqual({ patch: { start_date: null } })
  })

  it('reports no change as a null patch', () => {
    expect(computeDatesPatch(t(), '2026-09-07', '2026-09-10')).toEqual({ patch: null })
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
