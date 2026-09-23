<script setup>
import { previewThumbUrl } from '../lib/kitsuLinks.js'

const props = defineProps({
  task: { type: Object, required: true }, // a row from useDashboardData (dueDate, assignees, klass, …)
  draggable: { type: Boolean, default: false },
  // A dimmed, non-interactive copy on a day between start_date and due_date —
  // the real card lives on the due date. Never draggable regardless of the
  // `draggable` prop; still clickable to open the shot.
  ghost: { type: Boolean, default: false },
  // Locally moved but not yet written to Kitsu — see the Schedule tab's
  // Save/Discard bar.
  unsaved: { type: Boolean, default: false }
})
defineEmits(['dragstart', 'dragend', 'open'])

const thumbUrl = previewThumbUrl(props.task.previewFileId)
</script>

<template>
  <div
    class="schedCard"
    :class="{ draggable: draggable && !ghost, ghost, unsaved }"
    :draggable="draggable && !ghost"
    :title="task.shotName + ' · ' + task.taskTypeName + ' · ' + task.statusName + (ghost ? ' · in progress' : '') + (unsaved ? ' · not saved yet' : '')"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
    @click="$emit('open')"
  >
    <img v-if="thumbUrl" class="schedThumbImg" :src="thumbUrl" :alt="task.shotName" loading="lazy" @error="$event.target.style.display = 'none'">
    <div v-else class="schedThumbFallback">{{ (task.shotName || '?').slice(0, 2).toUpperCase() }}</div>
    <span v-if="!ghost" class="schedStatusBadge" :class="task.klass">{{ task.statusName }}</span>
    <span v-if="unsaved" class="schedUnsavedDot" title="Not saved yet"></span>
    <div class="schedCaption">
      <span class="schedCaptionShot">{{ task.shotName }}</span>
      <span class="schedCaptionType">{{ task.taskTypeName }}</span>
    </div>
  </div>
</template>
