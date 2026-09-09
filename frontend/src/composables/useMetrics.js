import { computed } from 'vue'
import { useDashboardData } from './useDashboardData.js'
import * as m from '../lib/metrics.js'
import { CLASS_COLOR } from '../lib/format.js'

// Reactive metric bundle driven by the current production filter.
export function useMetrics() {
  const { filteredRows, filteredProjects, filteredShotCount } = useDashboardData()
  const today = new Date()
  const rows = filteredRows

  const kpis = computed(() => m.kpis(rows.value, today, filteredShotCount.value))
  const deadline = computed(() => m.deadline(filteredProjects.value, today))

  const statusSegments = computed(() =>
    m.statusBreakdown(rows.value).map((s) => ({
      label: s.label,
      count: s.count,
      color: CLASS_COLOR[s.key]
    }))
  )

  const quota = computed(() => m.weeklyQuota(rows.value, today))
  const quotaSegments = computed(() => [
    { label: 'Delivered this week', count: quota.value.done, color: 'var(--purple)' },
    { label: 'Remaining', count: quota.value.remaining, color: 'var(--line)' }
  ])

  const deliveryLoad = computed(() => m.deliveryLoad(rows.value, today))
  const severity = computed(() => m.overdueSeverity(rows.value, today))
  const handoffs = computed(() => m.handoffs(rows.value, today))
  const artistPressure = computed(() => m.artistPressure(rows.value, today))
  const departments = computed(() => m.departments(rows.value))
  const statusMatrix = computed(() => m.statusMatrix(rows.value))
  const overdueQueue = computed(() => m.overdueQueue(rows.value, today))

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
    overdueQueue
  }
}
