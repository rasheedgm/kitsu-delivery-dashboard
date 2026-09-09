<script setup>
import { computed, ref } from 'vue'
import { CLASS_LABEL } from '../lib/format.js'

const props = defineProps({
  rows: { type: Array, default: () => [] } // from metrics.overdueQueue()
})

const search = ref('')
const statusFilter = ref('all')

const statusOptions = computed(() => {
  const seen = new Set(props.rows.map((r) => r.klass))
  return [...seen].map((k) => ({ value: k, label: CLASS_LABEL[k] }))
})

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return props.rows.filter((r) => {
    const matchesText = !q || `${r.shot} ${r.artist} ${r.dept} ${r.status}`.toLowerCase().includes(q)
    const matchesStatus = statusFilter.value === 'all' || r.klass === statusFilter.value
    return matchesText && matchesStatus
  })
})
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Overdue recovery queue</div>
      <div class="hint">{{ visible.length }} of {{ rows.length }} overdue tasks</div>
    </div>
    <div class="controls">
      <input v-model="search" class="search" placeholder="Search shot, artist, department…">
      <select v-model="statusFilter" class="select">
        <option value="all">All statuses</option>
        <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Shot</th><th>Dept</th><th>Artist</th><th>Status</th><th>Due</th><th class="num">Days late</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in visible" :key="i">
            <td class="mono">{{ r.shot }}</td>
            <td>{{ r.dept }}</td>
            <td>{{ r.artist }}</td>
            <td><span class="pill" :class="r.klass">{{ r.status }}</span></td>
            <td>{{ r.due }}</td>
            <td class="num late">{{ r.daysLate }}d</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note">Overdue = past its due date and not at a done status. Days late is counted from the task due date.</div>
  </div>
</template>
