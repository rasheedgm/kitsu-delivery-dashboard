// Delivery Queue filter: a small plain object that round-trips through the
// route's hash-query (shareable/bookmarkable link) and through localStorage
// (saved views). Keep every value a plain string so both work unmodified.

import { CLASS, CLASS_LABEL } from './format.js'

export const DEFAULT_FILTER = Object.freeze({
  q: '',
  status: 'all', // 'all' | CLASS.*
  dept: 'all', // 'all' | task type name
  artist: 'all', // 'all' | assignee name
  due: 'overdue', // 'all' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'YYYY-MM-DD'
  severity: 'all' // 'all' | '0-7' | '8-14' | '15+'
})

const FILTER_KEYS = Object.keys(DEFAULT_FILTER)

const DUE_LABEL = {
  all: 'Any due date',
  overdue: 'Overdue',
  today: 'Due today',
  tomorrow: 'Due tomorrow',
  week: 'Due this week'
}

const SEVERITY_LABEL = {
  '0-7': '0–7 days late',
  '8-14': '8–14 days late',
  '15+': '15+ days late'
}

export function dueLabel(value) {
  if (DUE_LABEL[value]) return DUE_LABEL[value]
  // exact ISO date, e.g. from a delivery-load bar click
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : `Due ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
}

// Build a filter from a route query object (vue-router query values can be
// string | string[] | null — normalize to a single string per key).
export function filterFromQuery(query = {}) {
  const out = { ...DEFAULT_FILTER }
  for (const key of FILTER_KEYS) {
    const raw = query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value) out[key] = value
  }
  return out
}

// Only non-default fields, so URLs / saved views stay short and readable.
export function filterToQuery(filter) {
  const out = {}
  for (const key of FILTER_KEYS) {
    if (filter[key] && filter[key] !== DEFAULT_FILTER[key]) out[key] = filter[key]
  }
  return out
}

export function isDefaultFilter(filter) {
  return FILTER_KEYS.every((key) => (filter[key] || DEFAULT_FILTER[key]) === DEFAULT_FILTER[key])
}

// Human-readable chips for the active (non-default) filter fields, each with
// a `clear` patch that resets just that one field.
export function describeFilter(filter) {
  const chips = []
  if (filter.q) chips.push({ key: 'q', label: `“${filter.q}”`, clear: { q: '' } })
  if (filter.status !== 'all') {
    chips.push({ key: 'status', label: CLASS_LABEL[filter.status] || filter.status, clear: { status: 'all' } })
  }
  if (filter.dept !== 'all') chips.push({ key: 'dept', label: filter.dept, clear: { dept: 'all' } })
  if (filter.artist !== 'all') chips.push({ key: 'artist', label: filter.artist, clear: { artist: 'all' } })
  if (filter.due !== DEFAULT_FILTER.due) chips.push({ key: 'due', label: dueLabel(filter.due), clear: { due: DEFAULT_FILTER.due } })
  if (filter.severity !== 'all') {
    chips.push({ key: 'severity', label: SEVERITY_LABEL[filter.severity] || filter.severity, clear: { severity: 'all' } })
  }
  return chips
}

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: CLASS.NOT_STARTED, label: CLASS_LABEL[CLASS.NOT_STARTED] },
  { value: CLASS.WIP, label: CLASS_LABEL[CLASS.WIP] },
  { value: CLASS.RETAKE, label: CLASS_LABEL[CLASS.RETAKE] },
  { value: CLASS.DONE, label: CLASS_LABEL[CLASS.DONE] }
]

// Route query minus this module's own keys — used when navigating to the
// Delivery Queue with a brand-new filter, so a stale filter left over from a
// previous visit doesn't leak into it (unrelated params like dark_theme do).
export function stripFilterKeys(query = {}) {
  const out = { ...query }
  for (const key of FILTER_KEYS) delete out[key]
  return out
}

export const DUE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'tomorrow', label: 'Due tomorrow' },
  { value: 'week', label: 'Due this week' },
  { value: 'all', label: 'Any due date' }
]
