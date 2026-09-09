// Pure metric computations. Input: `rows` — one normalized object per shot task
// (see useDashboardData.js for the shape) — plus a `today` Date. Everything the
// dashboard renders is derived here so it can be unit-tested without a browser.

import {
  CLASS,
  CLASS_LABEL,
  addDays,
  daysBetween,
  isoKey,
  isoWeekRange,
  shortLabel,
  startOfDay
} from './format.js'

export function isOverdue(row, today) {
  return !!row.dueDate && row.klass !== CLASS.DONE && row.dueDate < startOfDay(today)
}

function isSameDay(a, b) {
  return a && daysBetween(a, b) === 0
}

export function weeklyQuota(rows, today = new Date()) {
  const { start, end } = isoWeekRange(today)
  const dueThisWeek = rows.filter((r) => r.dueDate && r.dueDate >= start && r.dueDate < end)
  const total = dueThisWeek.length
  const done = dueThisWeek.filter((r) => r.klass === CLASS.DONE).length
  const remaining = total - done
  const pct = total ? Math.round((done / total) * 100) : 0
  return { total, done, remaining, pct }
}

export function kpis(rows, today = new Date(), shotsInScope = 0) {
  const t0 = startOfDay(today)
  const quota = weeklyQuota(rows, today)
  return {
    overdue: rows.filter((r) => isOverdue(r, today)).length,
    notStarted: rows.filter((r) => r.klass === CLASS.NOT_STARTED).length,
    dueToday: rows.filter((r) => isSameDay(r.dueDate, t0)).length,
    retakes: rows.filter((r) => r.klass === CLASS.RETAKE).length,
    shotsInScope,
    delivered: rows.filter((r) => r.klass === CLASS.DONE).length,
    quotaPct: quota.pct,
    quotaDone: quota.done,
    quotaTotal: quota.total,
    quotaRemaining: quota.remaining
  }
}

export function statusBreakdown(rows) {
  const order = [CLASS.WIP, CLASS.NOT_STARTED, CLASS.RETAKE, CLASS.DONE]
  const counts = Object.fromEntries(order.map((k) => [k, 0]))
  for (const r of rows) counts[r.klass] = (counts[r.klass] || 0) + 1
  return order
    .map((key) => ({ key, label: CLASS_LABEL[key], count: counts[key] }))
    .filter((s) => s.count > 0)
}

export function deliveryLoad(rows, today = new Date(), days = 7) {
  const start = startOfDay(today)
  const buckets = []
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i)
    const key = isoKey(date)
    const inDay = rows.filter((r) => r.dueDate && isoKey(r.dueDate) === key)
    buckets.push({
      date,
      label: shortLabel(date),
      isToday: i === 0,
      count: inDay.length,
      done: inDay.filter((r) => r.klass === CLASS.DONE).length
    })
  }
  return buckets
}

export function overdueSeverity(rows, today = new Date()) {
  const overdue = rows.filter((r) => isOverdue(r, today))
  const defs = [
    { label: '15+ days', min: 15, max: Infinity },
    { label: '8–14 days', min: 8, max: 14 },
    { label: '0–7 days', min: 0, max: 7 }
  ]
  const total = overdue.length || 1
  return defs.map((def) => {
    const count = overdue.filter((r) => {
      const late = -daysBetween(today, r.dueDate)
      return late >= def.min && late <= def.max
    }).length
    return { label: def.label, count, pct: Math.round((count / total) * 100) }
  })
}

function groupCount(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!key) continue
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function artistPressure(rows, today = new Date()) {
  const overdue = rows.filter((r) => isOverdue(r, today))
  const expanded = []
  for (const r of overdue) {
    const names = r.assigneeNames.length ? r.assigneeNames : ['Unassigned']
    for (const name of names) expanded.push({ name })
  }
  return groupCount(expanded, (x) => x.name)
}

export function handoffs(rows, today = new Date()) {
  const t0 = startOfDay(today)
  const t1 = addDays(t0, 1)
  const pick = (day) =>
    rows
      .filter((r) => isSameDay(r.dueDate, day) && r.klass !== CLASS.DONE)
      .map((r) => ({
        shot: r.shotName,
        dept: r.taskTypeName,
        artist: r.assigneeNames[0] || 'Unassigned',
        klass: r.klass,
        status: r.statusName
      }))
      .sort((a, b) => a.shot.localeCompare(b.shot))
  return { today: pick(t0), tomorrow: pick(t1) }
}

export function departments(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.taskTypeName)) {
      map.set(r.taskTypeName, { name: r.taskTypeName, required: 0, inProgress: 0, done: 0, notStarted: 0 })
    }
    const d = map.get(r.taskTypeName)
    d.required += 1
    if (r.klass === CLASS.DONE) d.done += 1
    else if (r.klass === CLASS.NOT_STARTED) d.notStarted += 1
    else d.inProgress += 1
  }
  return [...map.values()]
    .map((d) => ({ ...d, pct: d.required ? Math.round((d.inProgress / d.required) * 100) : 0 }))
    .sort((a, b) => b.required - a.required)
}

export function statusMatrix(rows) {
  const classes = [CLASS.NOT_STARTED, CLASS.WIP, CLASS.RETAKE, CLASS.DONE]
  const types = [...new Set(rows.map((r) => r.taskTypeName))].sort()
  const cells = {}
  const rowTotals = {}
  const colTotals = Object.fromEntries(classes.map((c) => [c, 0]))
  for (const type of types) {
    cells[type] = Object.fromEntries(classes.map((c) => [c, 0]))
    rowTotals[type] = 0
  }
  for (const r of rows) {
    if (!cells[r.taskTypeName] || cells[r.taskTypeName][r.klass] === undefined) continue
    cells[r.taskTypeName][r.klass] += 1
    rowTotals[r.taskTypeName] += 1
    colTotals[r.klass] += 1
  }
  return {
    classes: classes.map((c) => ({ key: c, label: CLASS_LABEL[c] })),
    types,
    cells,
    rowTotals,
    colTotals,
    grandTotal: rows.length
  }
}

export function overdueQueue(rows, today = new Date()) {
  return rows
    .filter((r) => isOverdue(r, today))
    .map((r) => ({
      shot: r.shotName,
      dept: r.taskTypeName,
      artist: r.assigneeNames[0] || 'Unassigned',
      klass: r.klass,
      status: r.statusName,
      due: r.dueDate ? isoKey(r.dueDate) : '—',
      daysLate: -daysBetween(today, r.dueDate)
    }))
    .sort((a, b) => b.daysLate - a.daysLate)
}

// Nearest future delivery target across the given projects (uses project
// end_date). Returns { date, daysLeft, projectName } or null.
export function deadline(projects, today = new Date()) {
  const t0 = startOfDay(today)
  const candidates = (projects || [])
    .filter((p) => p.end_date)
    .map((p) => ({ name: p.name, date: startOfDay(new Date(p.end_date)) }))
    .sort((a, b) => a.date - b.date)
  const next = candidates.find((c) => c.date >= t0) || candidates[candidates.length - 1]
  if (!next) return null
  return { date: next.date, projectName: next.name, daysLeft: daysBetween(today, next.date) }
}
