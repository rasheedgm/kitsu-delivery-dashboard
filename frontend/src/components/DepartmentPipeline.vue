<script setup>
import { computed } from 'vue'

const props = defineProps({
  departments: { type: Array, default: () => [] } // [{ name, required, inProgress, done, notStarted, pct }]
})

const totals = computed(() =>
  props.departments.reduce(
    (acc, d) => ({
      required: acc.required + d.required,
      inProgress: acc.inProgress + d.inProgress,
      done: acc.done + d.done
    }),
    { required: 0, inProgress: 0, done: 0 }
  )
)
const emit = defineEmits(['select'])
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Department pipeline</div>
      <div class="hint">% of tasks in progress</div>
    </div>
    <div class="dept">
      <div
        v-for="d in departments"
        :key="d.name"
        class="deptRow clickable"
        @click="emit('select', { dept: d.name, due: 'all' })"
      >
        <div class="deptName">{{ d.name }}</div>
        <div class="track"><div class="fill" :style="{ width: d.pct + '%' }"></div></div>
        <div class="deptNum">{{ d.inProgress }} / {{ d.required }}</div>
      </div>
    </div>
    <div class="deptFoot">
      <div class="smallStat"><b>{{ totals.required }}</b><span>tasks</span></div>
      <div class="smallStat"><b>{{ totals.inProgress }}</b><span>in progress</span></div>
      <div class="smallStat"><b>{{ totals.done }}</b><span>delivered</span></div>
    </div>
  </div>
</template>
