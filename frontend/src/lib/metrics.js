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
    { key: '15+', label: '15+ days', min: 15, max: Infinity },
    { key: '8-14', label: '8–14 days', min: 8, max: 14 },
    { key: '0-7', label: '0–7 days', min: 0, max: 7 }
  ]
  const total = overdue.length || 1
  return defs.map((def) => {
    const count = overdue.filter((r) => {
      const late = -daysBetween(today, r.dueDate)
      return late >= def.min && late <= def.max
    }).length
    return { key: def.key, label: def.label, count, pct: Math.round((count / total) * 100) }
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
        projectId: r.projectId,
        shotId: r.shotId,
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

// General, filterable task list — backs the Delivery Queue view and every
// drill-through click (KPI card, donut slice, bar, artist, department cell…).
// `filter` matches the shape in lib/filters.js; any field can be omitted.
export function queueRows(rows, filter = {}, today = new Date()) {
  const f = { status: 'all', dept: 'all', artist: 'all', due: 'overdue', severity: 'all', q: '', ...filter }
  const t0 = startOfDay(today)
  const tomorrow = addDays(t0, 1)
  const week = isoWeekRange(today)
  const q = (f.q || '').toLowerCase().trim()

  function matchesDue(r) {
    switch (f.due) {
      case 'all':
        return true
      case 'overdue':
        return isOverdue(r, today)
      case 'today':
        return isSameDay(r.dueDate, t0)
      case 'tomorrow':
        return isSameDay(r.dueDate, tomorrow)
      case 'week':
        return !!r.dueDate && r.dueDate >= week.start && r.dueDate < week.end
      default:
        // an exact ISO date string, e.g. from clicking a delivery-load bar
        return !!r.dueDate && isoKey(r.dueDate) === f.due
    }
  }

  function matchesSeverity(r) {
    if (f.severity === 'all') return true
    if (!isOverdue(r, today)) return false
    const late = -daysBetween(today, r.dueDate)
    const [lo, hi] = f.severity === '15+' ? [15, Infinity] : f.severity === '8-14' ? [8, 14] : [0, 7]
    return late >= lo && late <= hi
  }

  function matches(r) {
    if (f.status !== 'all' && r.klass !== f.status) return false
    if (f.dept !== 'all' && r.taskTypeName !== f.dept) return false
    if (f.artist !== 'all') {
      const names = r.assigneeNames.length ? r.assigneeNames : ['Unassigned']
      if (!names.includes(f.artist)) return false
    }
    if (!matchesDue(r)) return false
    if (!matchesSeverity(r)) return false
    if (q) {
      const haystack = `${r.shotName} ${r.taskTypeName} ${r.assigneeNames.join(' ')} ${r.statusName} ${r.projectName}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }

  const mapped = rows.filter(matches).map((r) => ({
    projectId: r.projectId,
    projectName: r.projectName,
    shotId: r.shotId,
    shot: r.shotName,
    dept: r.taskTypeName,
    artist: r.assigneeNames[0] || 'Unassigned',
    klass: r.klass,
    status: r.statusName,
    due: r.dueDate ? isoKey(r.dueDate) : '—',
    dueTime: r.dueDate ? r.dueDate.getTime() : null,
    daysLate: r.dueDate ? -daysBetween(today, r.dueDate) : null
  }))

  if (f.due === 'overdue') {
    mapped.sort((a, b) => b.daysLate - a.daysLate)
  } else {
    mapped.sort((a, b) => {
      const at = a.dueTime ?? Infinity
      const bt = b.dueTime ?? Infinity
      return at - bt || a.shot.localeCompare(b.shot)
    })
  }
  return mapped
}

// Backward-compatible shorthand used by the Overview tab's severity callout.
export function overdueQueue(rows, today = new Date()) {
  return queueRows(rows, { due: 'overdue' }, today)
}

// --- Shot-level rows ---------------------------------------------------
// Kitsu has no separate "shot status" — it's a task's status. Which task
// represents the shot is a studio call (see composables/useSettings.js):
// either an explicit task type ("Client Delivery"), or — until a studio
// configures that — the shot's chronologically last task, as a reasonable
// default. Once built, a shot row has the same `dueDate`/`klass` shape as a
// task row, so every existing row-based metric (kpis, weeklyQuota,
// statusBreakdown, …) works unchanged on shot rows too.

function pickRepresentativeTask(tasks, settings) {
  if (!tasks.length) return null
  if (settings.shotStatusTaskTypeId) {
    return tasks.find((t) => t.taskTypeId === settings.shotStatusTaskTypeId) || null
  }
  const withDue = tasks.filter((t) => t.dueDate)
  if (withDue.length) {
    return withDue.reduce((latest, t) => (t.dueDate > latest.dueDate ? t : latest))
  }
  return tasks[tasks.length - 1]
}

function classifyShotStatus(task, settings) {
  if (!task) return CLASS.NOT_STARTED
  if (settings.deliveredStatusIds.includes(task.statusId)) return CLASS.DONE
  if (settings.retakeStatusIds.includes(task.statusId)) return CLASS.RETAKE
  // No explicit studio override for this status: fall back to the task's own
  // flag-based classification (is_done / is_retake / is_default).
  return task.klass
}

// `shots` is useDashboardData's per-shot list (each with an embedded `.tasks`
// array) — one shot row comes out per shot, including shots with no tasks at
// all yet (classified "not started", no due date).
export function buildShotRows(shots, settings) {
  return (shots || []).map((shot) => {
    const rep = pickRepresentativeTask(shot.tasks || [], settings)
    return {
      shotId: shot.shotId,
      projectId: shot.projectId,
      projectName: shot.projectName,
      shotName: shot.shotName,
      taskTypeName: rep ? rep.taskTypeName : null,
      statusName: rep ? rep.statusName : 'No task yet',
      klass: classifyShotStatus(rep, settings),
      dueDate: rep ? rep.dueDate : null,
      assigneeNames: rep ? rep.assigneeNames : []
    }
  })
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
