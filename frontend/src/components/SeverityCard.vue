<script setup>
import { computed } from 'vue'

const props = defineProps({
  buckets: { type: Array, default: () => [] } // [{ key, label, count, pct }]
})
const emit = defineEmits(['select'])

const total = computed(() => props.buckets.reduce((s, b) => s + b.count, 0))
const critical = computed(() => props.buckets.find((b) => b.key === '15+')?.count || 0)
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Overdue severity</div>
      <div class="hint">{{ total }} overdue tasks</div>
    </div>
    <div class="severity">
      <template v-for="b in buckets" :key="b.label">
        <div
          class="sevRow"
          :class="{ clickable: b.count > 0 }"
          @click="b.count > 0 && emit('select', { due: 'overdue', severity: b.key })"
        >
          <div><b>{{ b.label }}</b><span>{{ b.count }} tasks</span></div>
          <strong>{{ b.pct }}%</strong>
        </div>
        <div class="sevTrack"><i :style="{ width: b.pct + '%' }"></i></div>
      </template>
      <div v-if="total" class="severityCallout">
        <b>{{ critical }} of {{ total }}</b> overdue tasks are already 15+ days late.
      </div>
    </div>
  </div>
</template>
