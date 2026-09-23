<script setup>
import { previewThumbUrl } from '../lib/kitsuLinks.js'

const props = defineProps({
  task: { type: Object, required: true }, // a row from useDashboardData (dueDate, assignees, klass, …)
  draggable: { type: Boolean, default: false }
})
defineEmits(['dragstart', 'dragend', 'open'])

const thumbUrl = previewThumbUrl(props.task.previewFileId)
</script>

<template>
  <div
    class="schedCard"
    :class="{ draggable }"
    :draggable="draggable"
    :title="task.shotName + ' · ' + task.taskTypeName + ' · ' + task.statusName"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend', $event)"
    @click="$emit('open')"
  >
    <div class="schedThumb">
      <img v-if="thumbUrl" :src="thumbUrl" :alt="task.shotName" loading="lazy" @error="$event.target.style.display = 'none'">
      <span v-else class="schedThumbFallback">{{ (task.shotName || '?').slice(0, 2).toUpperCase() }}</span>
    </div>
    <div class="schedCardBody">
      <div class="schedShot">{{ task.shotName }}</div>
      <div class="schedType">{{ task.taskTypeName }}</div>
      <span class="pill schedPill" :class="task.klass">{{ task.statusName }}</span>
    </div>
  </div>
</template>
