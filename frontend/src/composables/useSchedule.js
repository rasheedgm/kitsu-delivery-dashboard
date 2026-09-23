import { computed, ref } from 'vue'
import { useDashboardData } from './useDashboardData.js'
import { updateTask } from '../api/kitsu.js'
import { isoKey } from '../lib/format.js'
import { buildScheduleGrid, computeMovePatch, dropAffectsOtherAssignees, shiftWeek, weekStart } from '../lib/schedule.js'

// Kitsu's own permission rules (zou/app/services/user_service.py
// check_supervisor_task_access) — mirrored here so the board can disable
// drags a person isn't allowed to make, rather than let them fail after the
// fact. admin/manager: anything. supervisor: due_date only (not assignees,
// and only within their own department, which we don't attempt to replicate
// client-side — a supervisor dragging a card across a department boundary
// still gets a server-side rejection + revert). Everyone else: read-only.
const CAN_EDIT_DUE_DATE = new Set(['admin', 'manager', 'supervisor'])
const CAN_EDIT_ASSIGNEES = new Set(['admin', 'manager'])

function isDemoMode() {
  return new URLSearchParams(window.location.search).get('demo') === '1'
}

export function useSchedule() {
  const { state, filteredRows, applyTaskPatch } = useDashboardData()

  const start = ref(weekStart(new Date()))
  const grid = computed(() => buildScheduleGrid(filteredRows.value, start.value))

  const canEditDueDate = computed(() => CAN_EDIT_DUE_DATE.has(state.role))
  const canEditAssignees = computed(() => CAN_EDIT_ASSIGNEES.has(state.role))

  function goPrevWeek() {
    start.value = shiftWeek(start.value, -1)
  }
  function goNextWeek() {
    start.value = shiftWeek(start.value, 1)
  }
  function goToday() {
    start.value = weekStart(new Date())
  }

  // Returns { ok, error, confirmNeeded }. `confirmNeeded` means the caller
  // must re-call with `confirmed: true` — this drop would silently drop a
  // co-assignee and the UI should ask first (skipped for a plain reorder).
  async function moveTask(task, fromPersonId, toPersonId, toDateKey, { confirmed = false } = {}) {
    const rowChanged = fromPersonId !== toPersonId
    if (rowChanged && !canEditAssignees.value) {
      return { ok: false, error: "Only admins and managers can reassign tasks — you can still move it to a different day on this person's row." }
    }
    if (!canEditDueDate.value) {
      return { ok: false, error: 'You do not have permission to reschedule tasks.' }
    }
    if (!confirmed && dropAffectsOtherAssignees(task, fromPersonId, toPersonId)) {
      return { ok: false, confirmNeeded: true }
    }

    const patch = computeMovePatch(task, fromPersonId, toPersonId, toDateKey)
    if (!patch) return { ok: true } // dropped back where it started

    const previousPatch = {}
    if ('due_date' in patch) previousPatch.due_date = task.dueDate ? isoKey(task.dueDate) : null
    if ('assignees' in patch) previousPatch.assignees = [...task.assignees]

    applyTaskPatch(task.taskId, patch) // optimistic

    if (isDemoMode()) return { ok: true } // nothing to write to — the local mutation is the whole story

    try {
      await updateTask(task.taskId, patch)
      return { ok: true }
    } catch (err) {
      applyTaskPatch(task.taskId, previousPatch) // revert
      return { ok: false, error: err?.message || String(err) }
    }
  }

  return {
    weekStart: start,
    grid,
    canEditDueDate,
    canEditAssignees,
    goPrevWeek,
    goNextWeek,
    goToday,
    moveTask
  }
}
