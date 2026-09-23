<script setup>
import { computed, ref } from 'vue'
import { useSchedule } from '../composables/useSchedule.js'
import { openShot } from '../lib/kitsuLinks.js'
import { UNASSIGNED_ID } from '../lib/schedule.js'
import ScheduleCard from '../components/ScheduleCard.vue'

const { weekStart, grid, canEditDueDate, canEditAssignees, goPrevWeek, goNextWeek, goToday, moveTask } = useSchedule()

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

// --- drag state -------------------------------------------------------
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

async function onDrop(toPersonId, toDateKey) {
  dragOverCell.value = null
  const drag = dragging.value
  dragging.value = null
  if (!drag) return

  const result = await moveTask(drag.task, drag.fromPersonId, toPersonId, toDateKey)
  if (result.confirmNeeded) {
    pendingDrop.value = { task: drag.task, fromPersonId: drag.fromPersonId, toPersonId, toDateKey }
    return
  }
  if (!result.ok) showError(result.error)
}

async function confirmPendingDrop() {
  const drop = pendingDrop.value
  pendingDrop.value = null
  if (!drop) return
  const result = await moveTask(drop.task, drop.fromPersonId, drop.toPersonId, drop.toDateKey, { confirmed: true })
  if (!result.ok) showError(result.error)
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
      <div v-if="!grid.rows.length" class="empty">No tasks due this week (for the selected production).</div>
      <div v-else class="schedBoard">
        <div class="schedGrid" :style="{ '--sched-cols': grid.days.length }">
          <div class="schedCorner"></div>
          <div v-for="d in grid.days" :key="d.key" class="schedDayHead" :class="{ today: d.isToday }">
            <span class="schedWeekday">{{ d.weekday }}</span>
            <span class="schedDayNum">{{ d.dayNum }}</span>
          </div>

          <template v-for="row in grid.rows" :key="row.personId">
            <div class="schedRowName" :class="{ unassigned: row.personId === UNASSIGNED_ID }">{{ row.name }}</div>
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
                v-for="t in row.cells[d.key]"
                :key="t.taskId"
                :task="t"
                :draggable="canEditDueDate"
                @dragstart="onDragStart(t, row.personId, $event)"
                @dragend="onDragEnd"
                @open="openShot(t.projectId, t.shotId)"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
