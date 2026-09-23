// Weekly schedule board: pure grid-building and drag-drop math. A "row" is a
// person (plus a synthetic "Unassigned" row); a "column" is one day, Monday
// through Sunday, of the displayed week. Kept separate from metrics.js since
// this is a different shape of data (grouped by person+day, not a flat list).

import { addDays, isoKey, isoWeekRange, startOfDay } from './format.js'

export const UNASSIGNED_ID = 'unassigned'

// Monday of the week containing `date`.
export function weekStart(date = new Date()) {
  return isoWeekRange(date).start
}

export function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function shiftWeek(start, deltaWeeks) {
  return addDays(start, deltaWeeks * 7)
}

export function isSameWeek(a, b) {
  return isoKey(weekStart(a)) === isoKey(weekStart(b))
}

function dayLabel(date) {
  return {
    date,
    key: isoKey(date),
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    dayNum: date.getDate(),
    isToday: isoKey(date) === isoKey(startOfDay(new Date()))
  }
}

// Build the board: one row per person who has a task due this week (plus
// "Unassigned" if any task has no assignee), each with one cell per day
// holding the tasks due that day for that person. A multi-assignee task
// appears once per assignee — dragging it off one person's row doesn't
// remove it from a co-assignee's row unless the drag targets that field
// (see computeMovePatch).
export function buildScheduleGrid(rows, start) {
  const days = weekDays(start).map(dayLabel)
  const dayKeys = new Set(days.map((d) => d.key))
  const byPerson = new Map()

  function ensureRow(id, name) {
    if (!byPerson.has(id)) {
      byPerson.set(id, {
        personId: id,
        name,
        cells: Object.fromEntries(days.map((d) => [d.key, []]))
      })
    }
    return byPerson.get(id)
  }

  for (const row of rows) {
    if (!row.dueDate) continue
    const key = isoKey(row.dueDate)
    if (!dayKeys.has(key)) continue

    const assignees = row.assignees && row.assignees.length
      ? row.assignees.map((id, i) => ({ id, name: row.assigneeNames[i] || 'Unknown' }))
      : [{ id: UNASSIGNED_ID, name: 'Unassigned' }]

    for (const a of assignees) {
      ensureRow(a.id, a.name).cells[key].push(row)
    }
  }

  const people = [...byPerson.values()]
    .filter((r) => r.personId !== UNASSIGNED_ID)
    .sort((a, b) => a.name.localeCompare(b.name))
  const unassigned = byPerson.get(UNASSIGNED_ID)

  return { days, rows: unassigned ? [...people, unassigned] : people }
}

// What a drop actually changes. `task` is the row being moved, `fromPersonId`
// is which row it was dragged out of (relevant when it's on several rows),
// `toPersonId`/`toDateKey` describe the drop target. Returns a Kitsu task
// PUT payload with only the fields that actually changed, or null for a
// no-op drop (same cell).
export function computeMovePatch(task, fromPersonId, toPersonId, toDateKey) {
  const patch = {}

  const currentKey = task.dueDate ? isoKey(task.dueDate) : null
  if (currentKey !== toDateKey) patch.due_date = toDateKey

  if (fromPersonId !== toPersonId) {
    patch.assignees = toPersonId === UNASSIGNED_ID ? [] : [toPersonId]
  }

  return Object.keys(patch).length ? patch : null
}

// True when a drop would silently drop a co-assignee (task has >1 assignee
// and the row changed) — callers should confirm before applying.
export function dropAffectsOtherAssignees(task, fromPersonId, toPersonId) {
  return fromPersonId !== toPersonId && (task.assignees || []).length > 1
}
