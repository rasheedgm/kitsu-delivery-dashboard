// Date + status-classification helpers. Pure functions, unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000

// Parse a Kitsu date ("YYYY-MM-DD" or ISO datetime) into a Date at local
// midnight, or null. Kitsu due dates are calendar dates.
export function parseDate(value) {
  if (!value) return null
  const datePart = String(value).slice(0, 10)
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Whole days from `from` to `to` (to - from). Negative when `to` is in the past.
export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS)
}

export function addDays(date, n) {
  const copy = startOfDay(date)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function isoKey(date) {
  const d = startOfDay(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shortLabel(date) {
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    .toUpperCase()
}

// ISO week: Monday start. Returns { start, end } as local-midnight Dates,
// `end` being the following Monday (exclusive).
export function isoWeekRange(reference = new Date()) {
  const d = startOfDay(reference)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  const start = addDays(d, -day)
  return { start, end: addDays(start, 7) }
}

// --- Status classification -------------------------------------------------
// Kitsu task statuses carry boolean flags. We prefer flags and fall back to
// name matching for studio-specific statuses ("Client Retake", "Final", ...).

export const CLASS = {
  DONE: 'done',
  NOT_STARTED: 'not_started',
  RETAKE: 'retake',
  WIP: 'wip'
}

export const CLASS_LABEL = {
  [CLASS.DONE]: 'Delivered',
  [CLASS.NOT_STARTED]: 'Not started',
  [CLASS.RETAKE]: 'Retake / client retake',
  [CLASS.WIP]: 'WIP'
}

export const CLASS_COLOR = {
  [CLASS.DONE]: 'var(--green)',
  [CLASS.NOT_STARTED]: 'var(--slate)',
  [CLASS.RETAKE]: 'var(--blue)',
  [CLASS.WIP]: 'var(--amber)'
}

export function classifyStatus(status) {
  if (!status) return CLASS.NOT_STARTED
  const name = (status.short_name || status.name || '').toLowerCase()
  if (status.is_done || name === 'done' || name === 'final' || name === 'approved') {
    return CLASS.DONE
  }
  if (status.is_retake || /retake/.test(name)) return CLASS.RETAKE
  if (status.is_default || name === 'todo' || name === 'to do' || name === 'not started') {
    return CLASS.NOT_STARTED
  }
  return CLASS.WIP
}

// Build a lookup { [id]: status } from the task-status list.
export function indexById(list) {
  const map = {}
  for (const item of list || []) map[item.id] = item
  return map
}
