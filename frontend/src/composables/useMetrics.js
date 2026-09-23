import { computed } from 'vue'
import { useDashboardData } from './useDashboardData.js'
import { useSettings } from './useSettings.js'
import * as m from '../lib/metrics.js'
import { CLASS_COLOR } from '../lib/format.js'

// Reactive metric bundle driven by the current production filter.
export function useMetrics() {
  const { state: dashboard, filteredRows, filteredShots, filteredProjects, filteredShotCount } = useDashboardData()
  const { state: settings } = useSettings()
  const today = new Date()
  const rows = filteredRows

  const kpis = computed(() => m.kpis(rows.value, today, filteredShotCount.value))
  const deadline = computed(() => m.deadline(filteredProjects.value, today))

  const statusSegments = computed(() =>
    m.statusBreakdown(rows.value).map((s) => ({
      key: s.key,
      label: s.label,
      count: s.count,
      color: CLASS_COLOR[s.key]
    }))
  )

  const quota = computed(() => m.weeklyQuota(rows.value, today))
  const quotaSegments = computed(() => [
    { key: 'done', label: 'Delivered this week', count: quota.value.done, color: 'var(--purple)' },
    { key: 'remaining', label: 'Remaining', count: quota.value.remaining, color: 'var(--line)' }
  ])

  const deliveryLoad = computed(() => m.deliveryLoad(rows.value, today))
  const severity = computed(() => m.overdueSeverity(rows.value, today))
  const handoffs = computed(() => m.handoffs(rows.value, today))
  const artistPressure = computed(() => m.artistPressure(rows.value, today))
  const departments = computed(() => m.departments(rows.value))
  const statusMatrix = computed(() => m.statusMatrix(rows.value))
  const overdueQueue = computed(() => m.overdueQueue(rows.value, today))

  // --- Shots overview: one representative task per shot (see lib/metrics.js
  // buildShotRows + composables/useSettings.js for the studio-configurable
  // rule). Reuses the exact same row-shaped metric functions as the
  // task-level numbers above.
  const shotRows = computed(() => m.buildShotRows(filteredShots.value, settings))
  const shotKpis = computed(() => m.kpis(shotRows.value, today, shotRows.value.length))
  const shotStatusSegments = computed(() =>
    m.statusBreakdown(shotRows.value).map((s) => ({
      key: s.key,
      label: s.label,
      count: s.count,
      color: CLASS_COLOR[s.key]
    }))
  )
  const shotQuota = computed(() => m.weeklyQuota(shotRows.value, today))
  const shotQuotaSegments = computed(() => [
    { key: 'done', label: 'Delivered this week', count: shotQuota.value.done, color: 'var(--purple)' },
    { key: 'remaining', label: 'Remaining', count: shotQuota.value.remaining, color: 'var(--line)' }
  ])
  // Name of the configured shot-status task type, if any — used to narrow a
  // Shots Overview drill-through to exactly the tasks behind that number.
  const shotStatusDeptName = computed(
    () => dashboard.taskTypes.find((t) => t.id === settings.shotStatusTaskTypeId)?.name || null
  )

  // Not a computed itself (it takes an argument) — callers wrap it in their
  // own computed keyed on the filter they're using (see DeliveryView.vue).
  function queueRows(filter) {
    return m.queueRows(rows.value, filter, today)
  }

  return {
    rows,
    kpis,
    deadline,
    statusSegments,
    quota,
    quotaSegments,
    deliveryLoad,
    severity,
    handoffs,
    artistPressure,
    departments,
    statusMatrix,
    overdueQueue,
    queueRows,
    shotRows,
    shotKpis,
    shotStatusSegments,
    shotQuota,
    shotQuotaSegments,
    shotStatusDeptName
  }
}
