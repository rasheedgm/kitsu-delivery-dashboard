<script setup>
import { computed } from 'vue'

const props = defineProps({
  deadline: { type: Object, default: null }, // { date, projectName, daysLeft }
  overdue: { type: Number, default: 0 }
})

const risk = computed(() => {
  if (!props.deadline) return { label: 'NO TARGET DATE', cls: 'warn' }
  const d = props.deadline.daysLeft
  if (d < 0) return { label: 'PAST DEADLINE', cls: '' }
  if (d <= 21 || props.overdue > 20) return { label: 'HIGH RISK', cls: '' }
  if (d <= 45 || props.overdue > 5) return { label: 'AT RISK', cls: 'warn' }
  return { label: 'ON TRACK', cls: 'ok' }
})

const dateLabel = computed(() =>
  props.deadline
    ? props.deadline.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : '—'
)
</script>

<template>
  <div class="deadlineBanner">
    <div class="deadlineIntro">
      <div class="eyebrow">Nearest delivery target</div>
      <b>{{ deadline ? deadline.projectName : 'No production end date set' }}</b>
      <span v-if="deadline">Final delivery {{ dateLabel }}</span>
    </div>
    <div class="deadlineNumber">
      <span>{{ deadline ? Math.max(deadline.daysLeft, 0) : '—' }}</span><small>DAYS</small>
      <b>{{ dateLabel }}</b>
    </div>
    <div class="deadlineRisk">
      <span :class="risk.cls">{{ risk.label }}</span>
    </div>
  </div>
</template>
