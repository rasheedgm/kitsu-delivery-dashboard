// Weekly schedule board: pure grid-building and drag-drop math. A "row" is a
// person (plus a synthetic "Unassigned" row); a "column" is one day, Monday
// through Sunday, of the displayed week. Kept separate from metrics.js since
// this is a different shape of data (grouped by person+day, not a flat list).

import { addDays, daysBetween, isoKey, isoWeekRange, parseDate, startOfDay } from './format.js'

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

// Build the board: one row per person with a task touching this week (plus
// "Unassigned" if any such task has no assignee, and any `pinnedPersons`
// pinned on with zero tasks so there's somewhere to drop a new one), each
// with one cell per day holding entries for that person that day.
//
// A cell entry is `{ task, ghost }`: the real, draggable card sits on the
// task's due-date day (`ghost: false`); if it also has a `startDate` before
// that, a dimmed, non-interactive `ghost: true` copy fills every day from
// start_date up to (not including) the due date — including days in weeks
// where the due date itself isn't visible, so a long-running task still
// shows wherever its assignee is meant to be working on it that week.
//
// A multi-assignee task appears once per assignee — dragging it off one
// person's row doesn't remove it from a co-assignee's row unless the drag
// targets that field (see computeMovePatch).
export function buildScheduleGrid(rows, start, pinnedPersons = []) {
  const days = weekDays(start).map(dayLabel)
  const dayKeys = days.map((d) => d.key)
  const dayKeySet = new Set(dayKeys)
  const byPerson = new Map()

  function ensureRow(id, name) {
    if (!byPerson.has(id)) {
      byPerson.set(id, {
        personId: id,
        name,
        cells: Object.fromEntries(dayKeys.map((k) => [k, []]))
      })
    }
    return byPerson.get(id)
  }

  for (const person of pinnedPersons) ensureRow(person.id, person.name)

  for (const row of rows) {
    if (!row.dueDate) continue
    const dueKey = isoKey(row.dueDate)

    const touched = []
    if (dayKeySet.has(dueKey)) touched.push({ key: dueKey, ghost: false })
    if (row.startDate && row.startDate < row.dueDate) {
      const startKey = isoKey(row.startDate)
      for (const d of days) {
        if (d.key !== dueKey && d.date >= row.startDate && d.date < row.dueDate) {
          // The ghost sitting on the real start_date day is the trail's
          // leading edge — the UI makes it a drag handle for the start date.
          // (When start_date is in an earlier week, no visible ghost is it.)
          touched.push({ key: d.key, ghost: true, isStart: d.key === startKey })
        }
      }
    }
    if (!touched.length) continue

    const assignees = row.assignees && row.assignees.length
      ? row.assignees.map((id, i) => ({ id, name: row.assigneeNames[i] || 'Unknown' }))
      : [{ id: UNASSIGNED_ID, name: 'Unassigned' }]

    for (const a of assignees) {
      const person = ensureRow(a.id, a.name)
      for (const { key, ghost, isStart } of touched) {
        person.cells[key].push(isStart ? { task: row, ghost, isStart: true } : { task: row, ghost })
      }
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
  if (currentKey !== toDateKey) {
    patch.due_date = toDateKey
    // Keep the task's duration: the start date travels with the due date, so
    // moving a card doesn't silently stretch or shrink its ghost trail.
    if (task.startDate) {
      if (task.dueDate) {
        const span = Math.max(0, daysBetween(task.startDate, task.dueDate))
        patch.start_date = isoKey(addDays(parseDate(toDateKey), -span))
      } else if (isoKey(task.startDate) > toDateKey) {
        patch.start_date = toDateKey // no known span; just keep start <= due
      }
    }
  }

  if (fromPersonId !== toPersonId) {
    patch.assignees = toPersonId === UNASSIGNED_ID ? [] : [toPersonId]
  }

  return Object.keys(patch).length ? patch : null
}

export const START_AFTER_DUE = "Start date can't be after the due date."

// Dragging a trail's leading edge to `toDateKey` sets start_date only. Null
// for a no-op, or when it would land after the due date (callers should
// check `startAfterDue` first to say why).
export function startAfterDue(task, toDateKey) {
  return !!task.dueDate && toDateKey > isoKey(task.dueDate)
}

export function computeStartPatch(task, toDateKey) {
  if (!task.dueDate || startAfterDue(task, toDateKey)) return null
  const current = task.startDate ? isoKey(task.startDate) : null
  return current === toDateKey ? null : { start_date: toDateKey }
}

// The date editor sets both fields explicitly (either may be unchanged).
// Returns { error } or { patch } (patch is null when nothing changed).
// `startKey` may be empty to clear the start date; `dueKey` is required —
// a task without one has no card on the board.
export function computeDatesPatch(task, startKey, dueKey) {
  if (!dueKey) return { error: 'A due date is required.' }
  if (startKey && startKey > dueKey) return { error: START_AFTER_DUE }
  const patch = {}
  if ((task.dueDate ? isoKey(task.dueDate) : null) !== dueKey) patch.due_date = dueKey
  if ((task.startDate ? isoKey(task.startDate) : null) !== (startKey || null)) {
    patch.start_date = startKey || null
  }
  return { patch: Object.keys(patch).length ? patch : null }
}

// True when a drop would silently drop a co-assignee (task has >1 assignee
// and the row changed) — callers should confirm before applying.
export function dropAffectsOtherAssignees(task, fromPersonId, toPersonId) {
  return fromPersonId !== toPersonId && (task.assignees || []).length > 1
}
