<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { addDays, daysBetween, isoKey, parseDate } from '../lib/format.js'
import { computeDatesPatch } from '../lib/schedule.js'

// Popover for setting a task's start and due dates precisely (including
// across weeks, which dragging the ghost trail can't reach). "Apply" only
// stages the change — same unsaved/Save flow as a drag. Teleported to <body>
// and fixed-positioned from the clicked button's rect for the same reason
// SchedulePicker is: the board scrolls and would clip an absolute popover.
const props = defineProps({
  task: { type: Object, required: true },
  anchorRect: { type: Object, required: true }
})
const emit = defineEmits(['apply', 'close'])

const WIDTH = 250
const SPANS = [
  { days: 1, label: '1 day' },
  { days: 2, label: '2 days' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' }
]

const startVal = ref(props.task.startDate ? isoKey(props.task.startDate) : '')
const dueVal = ref(props.task.dueDate ? isoKey(props.task.dueDate) : '')
const root = ref(null)
const style = ref({ width: `${WIDTH}px`, top: '0px', left: '0px', visibility: 'hidden' })

const result = computed(() => computeDatesPatch(props.task, startVal.value, dueVal.value))
const error = computed(() => result.value.error || null)
const changed = computed(() => !!result.value.patch)

const span = computed(() => {
  if (!startVal.value || !dueVal.value) return null
  // Inclusive: start == due is 1 day of work.
  return daysBetween(parseDate(startVal.value), parseDate(dueVal.value)) + 1
})

function setSpan(days) {
  if (!dueVal.value) return
  startVal.value = isoKey(addDays(parseDate(dueVal.value), -(days - 1)))
}

function apply() {
  if (error.value || !changed.value) return
  emit('apply', startVal.value, dueVal.value)
}

function position() {
  const rect = props.anchorRect
  const height = root.value?.offsetHeight || 0
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - WIDTH - 8))
  let top = rect.bottom + 4
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 4)
  style.value = { width: `${WIDTH}px`, top: `${top}px`, left: `${left}px` }
}

function onMouseDown(event) {
  if (!root.value?.contains(event.target)) emit('close')
}
function onScroll(event) {
  if (root.value?.contains(event.target)) return
  emit('close')
}
function onKey(event) {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'Enter') apply()
}
const onResize = () => emit('close')

onMounted(async () => {
  await nextTick()
  position()
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <Teleport to="body">
    <div ref="root" class="schedPopover schedEditor" :style="style">
      <div class="schedEditorTitle">{{ task.shotName }} · {{ task.taskTypeName }}</div>

      <label class="schedEditorField">
        <span>Start</span>
        <input v-model="startVal" type="date" class="schedPopoverInput" :max="dueVal || undefined">
        <button v-if="startVal" type="button" class="schedEditorClear" title="Clear the start date" @click="startVal = ''">×</button>
      </label>
      <label class="schedEditorField">
        <span>Due</span>
        <input v-model="dueVal" type="date" class="schedPopoverInput">
      </label>

      <div class="schedEditorSpans">
        <span>Days</span>
        <button
          v-for="s in SPANS"
          :key="s.days"
          type="button"
          class="schedSpanBtn"
          :class="{ active: span === s.days }"
          :disabled="!dueVal"
          @click="setSpan(s.days)"
        >{{ s.label }}</button>
      </div>

      <div v-if="error" class="schedEditorError">{{ error }}</div>
      <div v-else-if="span !== null" class="schedEditorNote">{{ span }} day{{ span === 1 ? '' : 's' }} of work (start and due date both count)</div>
      <div v-else class="schedEditorNote">No start date — no trail is shown.</div>

      <div class="schedEditorActions">
        <button type="button" class="saveViewBtn ghost" @click="emit('close')">Cancel</button>
        <button type="button" class="saveViewBtn primary" :disabled="!!error || !changed" @click="apply">Apply</button>
      </div>
    </div>
  </Teleport>
</template>
