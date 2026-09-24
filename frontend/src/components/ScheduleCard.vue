<script setup>
import { computed } from 'vue'
import { previewThumbUrl } from '../lib/kitsuLinks.js'

const props = defineProps({
  task: { type: Object, required: true },
  draggable: { type: Boolean, default: false },
  ghost: { type: Boolean, default: false },
  // The ghost sitting on the task's real start_date: dragging it changes the
  // start date (a real card's drag changes the due date / row instead).
  startHandle: { type: Boolean, default: false },
  editable: { type: Boolean, default: false },
  unsaved: { type: Boolean, default: false }
})
defineEmits(['dragstart', 'dragend', 'open', 'edit'])

const thumbUrl = previewThumbUrl(props.task.previewFileId)
const canDrag = computed(() => props.draggable && (!props.ghost || props.startHandle))
const title = computed(() => {
  const base = `${props.task.shotName} · ${props.task.taskTypeName} · ${props.task.statusName}`
  if (props.ghost) {
    return base + (props.startHandle && props.draggable ? ' · in progress — drag to change the start date' : ' · in progress')
  }
  return base + (props.unsaved ? ' · not saved yet' : '')
})
</script>

<template>
  <div
    class="schedCard"
    :class="{ draggable: canDrag, ghost, startHandle: startHandle && draggable, unsaved }"
    :draggable="canDrag"
    :title="title"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
    @click="$emit('open')"
  >
    <img
      v-if="thumbUrl"
      class="schedThumbImg"
      :src="thumbUrl"
      :alt="task.shotName"
      loading="lazy"
      @error="$event.target.style.display = 'none'"
    >
    <div v-else class="schedThumbFallback">{{ (task.shotName || '?').slice(0, 2).toUpperCase() }}</div>
    <span v-if="!ghost" class="schedStatusBadge" :class="task.klass">{{ task.statusName }}</span>
    <span v-if="startHandle && draggable" class="schedStartTag">Start</span>
    <span v-if="unsaved" class="schedUnsavedDot" title="Not saved yet"></span>
    <button
      v-if="editable && !ghost"
      type="button"
      class="schedEditBtn"
      title="Edit start / due dates"
      @click.stop="$emit('edit', $event)"
    >✎</button>
    <div class="schedCaption">
      <span class="schedCaptionShot">{{ task.shotName }}</span>
      <span class="schedCaptionType">{{ task.taskTypeName }}</span>
    </div>
  </div>
</template>
