<script setup>
import { computed, ref } from 'vue'
import { useSchedule } from '../composables/useSchedule.js'
import { useDashboardData, personName } from '../composables/useDashboardData.js'
import { openShot } from '../lib/kitsuLinks.js'
import { isoKey } from '../lib/format.js'
import { UNASSIGNED_ID } from '../lib/schedule.js'
import ScheduleCard from '../components/ScheduleCard.vue'
import SchedulePicker from '../components/SchedulePicker.vue'

const {
  weekStart,
  grid,
  filteredRows,
  pinnedPersons,
  canEditDueDate,
  canEditAssignees,
  goPrevWeek,
  goNextWeek,
  goToday,
  pinPerson,
  unpinPerson,
  moveTask,
  scheduleTask
} = useSchedule()
const { state } = useDashboardData()

const weekLabel = computed(() => {
  const days = grid.value.days
  if (!days.length) return ''
  const first = days[0].date
  const last = days[6].date
  const sameMonth = first.getMonth() === last.getMonth()
  const fmt = (d, withMonth) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: withMonth ? 'short' : undefined, year: 'numeric' })
  return sameMonth
    ? `${first.getDate()}–${fmt(last, true)}`
    : `${fmt(first, true)} – ${fmt(last, true)}`
})

// People not already shown as a row (real tasks or already pinned) — no
// point offering to pin someone who's already on the board.
const pinnablePersons = computed(() => {
  const shown = new Set(grid.value.rows.map((r) => r.personId))
  return state.persons
    .filter((p) => !shown.has(p.id))
    .map((p) => ({ id: p.id, name: personName(p) }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function isRowEmpty(row) {
  return Object.values(row.cells).every((cell) => cell.length === 0)
}
function isPinned(personId) {
  return pinnedPersons.value.some((p) => p.id === personId)
}

function taskLabel(t) {
  const due = t.dueDate ? isoKey(t.dueDate) : 'no due date'
  return `${t.shotName} · ${t.taskTypeName} (${due})`
}
function taskSearchKey(t) {
  return `${t.shotName} ${t.taskTypeName} ${t.statusName} ${t.assigneeNames.join(' ')}`
}

// --- drag + drop-picker shared state -----------------------------------
const dragging = ref(null) // { task, fromPersonId }
const dragOverCell = ref(null) // 'personId|dateKey'
const pendingDrop = ref(null) // { task, fromPersonId, toPersonId, toDateKey } awaiting confirmation
const errorMessage = ref(null)
let errorTimer = null

function showError(message) {
  errorMessage.value = message
  clearTimeout(errorTimer)
  errorTimer = setTimeout(() => { errorMessage.value = null }, 6000)
}

function onDragStart(task, fromPersonId, event) {
  dragging.value = { task, fromPersonId }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.taskId) // Firefox needs *something* set
}

function onDragEnd() {
  dragging.value = null
  dragOverCell.value = null
}

function cellKey(personId, dateKey) {
  return `${personId}|${dateKey}`
}

async function applyMove(fn) {
  const result = await fn()
  if (result.confirmNeeded) return result
  if (!result.ok) showError(result.error)
  return result
}

async function onDrop(toPersonId, toDateKey) {
  dragOverCell.value = null
  const drag = dragging.value
  dragging.value = null
  if (!drag) return

  const result = await applyMove(() => moveTask(drag.task, drag.fromPersonId, toPersonId, toDateKey))
  if (result.confirmNeeded) {
    pendingDrop.value = { task: drag.task, fromPersonId: drag.fromPersonId, toPersonId, toDateKey, viaPicker: false }
  }
}

async function onScheduleFromPicker(task, toPersonId, toDateKey) {
  const result = await applyMove(() => scheduleTask(task, toPersonId, toDateKey))
  if (result.confirmNeeded) {
    pendingDrop.value = { task, toPersonId, toDateKey, viaPicker: true }
  }
}

async function confirmPendingDrop() {
  const drop = pendingDrop.value
  pendingDrop.value = null
  if (!drop) return
  await applyMove(() =>
    drop.viaPicker
      ? scheduleTask(drop.task, drop.toPersonId, drop.toDateKey, { confirmed: true })
      : moveTask(drop.task, drop.fromPersonId, drop.toPersonId, drop.toDateKey, { confirmed: true })
  )
}

function cancelPendingDrop() {
  pendingDrop.value = null
}
</script>

<template>
  <section>
    <div class="schedHead">
      <div class="schedNav">
        <button type="button" class="tab" @click="goPrevWeek">‹ Prev</button>
        <button type="button" class="tab" @click="goToday">Today</button>
        <button type="button" class="tab" @click="goNextWeek">Next ›</button>
      </div>
      <div class="schedWeekLabel">{{ weekLabel }}</div>
      <SchedulePicker
        v-if="canEditDueDate"
        label="+ Add person"
        title="Pin someone onto the board even with no tasks this week"
        placeholder="Search people…"
        :items="pinnablePersons"
        :search-key="(p) => p.name"
        @select="pinPerson"
      >
        <template #default="{ item }">{{ item.name }}</template>
      </SchedulePicker>
      <div class="schedPermNote" v-if="!canEditDueDate">Read-only — you don't have permission to reschedule tasks here.</div>
      <div class="schedPermNote" v-else-if="!canEditAssignees">You can move tasks between days, but only admins/managers can reassign them to a different person.</div>
    </div>

    <div v-if="pendingDrop" class="schedConfirm">
      <span>
        <b>{{ pendingDrop.task.shotName }}</b> is assigned to more than one person. Moving it here will
        reassign it <b>only</b> to this row — the other assignee will be removed. Continue?
      </span>
      <div class="schedConfirmActions">
        <button type="button" class="saveViewBtn primary" @click="confirmPendingDrop">Move it</button>
        <button type="button" class="saveViewBtn ghost" @click="cancelPendingDrop">Cancel</button>
      </div>
    </div>
    <div v-if="errorMessage" class="schedConfirm err">{{ errorMessage }}</div>

    <div class="card schedBoardCard">
      <div v-if="!grid.rows.length" class="empty">
        No tasks touch this week for the selected production.
        <template v-if="canEditDueDate"> Use "+ Add person" above to pin someone's row and schedule work onto it.</template>
      </div>
      <div v-else class="schedBoard">
        <div class="schedGrid" :style="{ '--sched-cols': grid.days.length }">
          <div class="schedCorner"></div>
          <div v-for="d in grid.days" :key="d.key" class="schedDayHead" :class="{ today: d.isToday }">
            <span class="schedWeekday">{{ d.weekday }}</span>
            <span class="schedDayNum">{{ d.dayNum }}</span>
          </div>

          <template v-for="row in grid.rows" :key="row.personId">
            <div class="schedRowName" :class="{ unassigned: row.personId === UNASSIGNED_ID }">
              <span class="schedRowNameText">{{ row.name }}</span>
              <button
                v-if="isPinned(row.personId) && isRowEmpty(row)"
                type="button"
                class="schedUnpin"
                title="Remove this empty row"
                @click="unpinPerson(row.personId)"
              >×</button>
            </div>
            <div
              v-for="d in grid.days"
              :key="d.key"
              class="schedCell"
              :class="{ today: d.isToday, over: dragOverCell === cellKey(row.personId, d.key) }"
              @dragover.prevent="dragOverCell = cellKey(row.personId, d.key)"
              @dragleave="dragOverCell === cellKey(row.personId, d.key) && (dragOverCell = null)"
              @drop.prevent="onDrop(row.personId, d.key)"
            >
              <ScheduleCard
                v-for="entry in row.cells[d.key]"
                :key="entry.task.taskId"
                :task="entry.task"
                :ghost="entry.ghost"
                :draggable="canEditDueDate"
                @dragstart="onDragStart(entry.task, row.personId, $event)"
                @dragend="onDragEnd"
                @open="openShot(entry.task.projectId, entry.task.shotId)"
              />
              <SchedulePicker
                v-if="canEditDueDate"
                label="+"
                title="Schedule an existing task onto this day"
                placeholder="Search shot, task type, artist…"
                align="right"
                :items="filteredRows"
                :search-key="taskSearchKey"
                @select="(t) => onScheduleFromPicker(t, row.personId, d.key)"
              >
                <template #default="{ item }">{{ taskLabel(item) }}</template>
              </SchedulePicker>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
