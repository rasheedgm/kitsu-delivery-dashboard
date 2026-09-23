import { computed, reactive, ref } from 'vue'
import { useDashboardData } from './useDashboardData.js'
import { updateTask } from '../api/kitsu.js'
import { isoKey } from '../lib/format.js'
import { UNASSIGNED_ID, buildScheduleGrid, computeMovePatch, dropAffectsOtherAssignees, shiftWeek, weekStart } from '../lib/schedule.js'

// Kitsu's own permission rules (zou/app/services/user_service.py
// check_supervisor_task_access) — mirrored here so the board can disable
// drags a person isn't allowed to make, rather than let them fail after the
// fact. admin/manager: anything. supervisor: due_date only (not assignees,
// and only within their own department, which we don't attempt to replicate
// client-side — a supervisor dragging a card across a department boundary
// still gets a server-side rejection when Save is pressed). Everyone else:
// read-only.
const CAN_EDIT_DUE_DATE = new Set(['admin', 'manager', 'supervisor'])
const CAN_EDIT_ASSIGNEES = new Set(['admin', 'manager'])

function isDemoMode() {
  return new URLSearchParams(window.location.search).get('demo') === '1'
}

// Rows pinned onto the board with zero tasks, so there's somewhere to drop a
// new one — a per-session convenience, not a saved preference: once a pinned
// person actually has a task, they show up on their own and the pin is moot.
// Module-level so it survives navigating away from /schedule and back.
const pinnedPersons = ref([])

// Dragging/scheduling a task only moves it on the board — nothing is written
// to Kitsu until Save. Keyed by taskId: `original` is what to restore on
// Discard, `next` is what Save sends (always the task's *current* full
// position, so moving the same card twice before saving just updates where
// it ends up, it doesn't queue two writes). Module-level so unsaved moves
// survive navigating away from /schedule and back, same as pinned rows.
const pending = reactive(new Map())

export function useSchedule() {
  const { state, filteredRows, applyTaskPatch } = useDashboardData()

  const start = ref(weekStart(new Date()))
  const grid = computed(() => buildScheduleGrid(filteredRows.value, start.value, pinnedPersons.value))

  const canEditDueDate = computed(() => CAN_EDIT_DUE_DATE.has(state.role))
  const canEditAssignees = computed(() => CAN_EDIT_ASSIGNEES.has(state.role))
  const pendingCount = computed(() => pending.size)
  const saving = ref(false)

  function goPrevWeek() {
    start.value = shiftWeek(start.value, -1)
  }
  function goNextWeek() {
    start.value = shiftWeek(start.value, 1)
  }
  function goToday() {
    start.value = weekStart(new Date())
  }

  function pinPerson(person) {
    if (!pinnedPersons.value.some((p) => p.id === person.id)) {
      pinnedPersons.value = [...pinnedPersons.value, person]
    }
  }
  function unpinPerson(id) {
    pinnedPersons.value = pinnedPersons.value.filter((p) => p.id !== id)
  }

  function isPending(taskId) {
    return pending.has(taskId)
  }

  // Returns { ok, error, confirmNeeded }. `confirmNeeded` means the caller
  // must re-call with `confirmed: true` — this drop would silently drop a
  // co-assignee and the UI should ask first (skipped for a plain reorder).
  // Stages the move locally only — see `save()` for the actual Kitsu write.
  function moveTask(task, fromPersonId, toPersonId, toDateKey, { confirmed = false } = {}) {
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

    if (!pending.has(task.taskId)) {
      pending.set(task.taskId, {
        taskId: task.taskId,
        original: {
          due_date: task.dueDate ? isoKey(task.dueDate) : null,
          assignees: [...task.assignees]
        }
      })
    }

    applyTaskPatch(task.taskId, patch) // local only — no network call here

    pending.get(task.taskId).next = {
      due_date: task.dueDate ? isoKey(task.dueDate) : null,
      assignees: [...task.assignees]
    }

    return { ok: true }
  }

  // "Add to this cell" from the picker instead of a drag: same underlying
  // move, but there's no drag source row, so decide fromPersonId contextually
  // — if the task is already on the target person's row, only the date
  // changes (co-assignees are left alone); otherwise it's a reassign, same
  // as dragging it there from wherever it currently sits.
  function scheduleTask(task, toPersonId, toDateKey, opts) {
    const alreadyOnTarget =
      toPersonId === UNASSIGNED_ID ? task.assignees.length === 0 : task.assignees.includes(toPersonId)
    const fromPersonId = alreadyOnTarget ? toPersonId : task.assignees[0] || UNASSIGNED_ID
    return moveTask(task, fromPersonId, toPersonId, toDateKey, opts)
  }

  function discardAll() {
    for (const entry of pending.values()) applyTaskPatch(entry.taskId, entry.original)
    pending.clear()
  }

  function discardOne(taskId) {
    const entry = pending.get(taskId)
    if (!entry) return
    applyTaskPatch(taskId, entry.original)
    pending.delete(taskId)
  }

  // Writes every staged move to Kitsu. Returns a list of failures (empty on
  // full success); a failed task's revert is NOT automatic here — it stays
  // pending (still shown as unsaved, on its moved-to cell) so the studio can
  // just try Save again rather than lose the position and have to redo it.
  async function save() {
    if (saving.value || pending.size === 0) return { failures: [] }
    saving.value = true
    const failures = []
    if (isDemoMode()) {
      pending.clear() // nothing to write to — the local move is the whole story
      saving.value = false
      return { failures }
    }
    for (const entry of [...pending.values()]) {
      try {
        await updateTask(entry.taskId, entry.next)
        pending.delete(entry.taskId)
      } catch (err) {
        failures.push({ taskId: entry.taskId, error: err?.message || String(err) })
      }
    }
    saving.value = false
    return { failures }
  }

  return {
    weekStart: start,
    grid,
    filteredRows,
    pinnedPersons,
    canEditDueDate,
    canEditAssignees,
    pendingCount,
    saving,
    isPending,
    goPrevWeek,
    goNextWeek,
    goToday,
    pinPerson,
    unpinPerson,
    moveTask,
    scheduleTask,
    save,
    discardAll,
    discardOne
  }
}
