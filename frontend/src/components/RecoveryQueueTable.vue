<script setup>
import { computed } from 'vue'
import { STATUS_OPTIONS, DUE_OPTIONS, describeFilter, isDefaultFilter, DEFAULT_FILTER, dueLabel } from '../lib/filters.js'
import { openShot } from '../lib/kitsuLinks.js'

const props = defineProps({
  rows: { type: Array, default: () => [] }, // filtered + mapped display rows (metrics.queueRows)
  allRows: { type: Array, default: () => [] }, // unfiltered task rows, for building dept/artist option lists
  filter: { type: Object, required: true }
})
const emit = defineEmits(['update:filter'])

const deptOptions = computed(() => [...new Set(props.allRows.map((r) => r.taskTypeName))].sort())

const artistOptions = computed(() => {
  const names = new Set()
  for (const r of props.allRows) {
    if (r.assigneeNames.length) r.assigneeNames.forEach((n) => names.add(n))
    else names.add('Unassigned')
  }
  return [...names].sort()
})

// Drill-throughs can set an exact ISO date (e.g. clicking a delivery-load
// bar) that isn't one of the canonical due-options — inject it so the select
// shows something meaningful instead of appearing blank.
const dueSelectOptions = computed(() => {
  if (DUE_OPTIONS.some((o) => o.value === props.filter.due)) return DUE_OPTIONS
  return [{ value: props.filter.due, label: dueLabel(props.filter.due) }, ...DUE_OPTIONS]
})

const chips = computed(() => describeFilter(props.filter))
const showClearAll = computed(() => !isDefaultFilter(props.filter))

function patch(p) {
  emit('update:filter', p)
}

function clearAll() {
  emit('update:filter', { ...DEFAULT_FILTER })
}
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Delivery queue</div>
      <div class="hint">{{ rows.length }} matching tasks · click a row to open the shot in Kitsu</div>
    </div>

    <div class="controls">
      <input
        class="search"
        placeholder="Search shot, artist, department…"
        :value="filter.q"
        @input="patch({ q: $event.target.value })"
      >
      <select class="select" :value="filter.due" @change="patch({ due: $event.target.value })">
        <option v-for="o in dueSelectOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select class="select" :value="filter.status" @change="patch({ status: $event.target.value })">
        <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select class="select" :value="filter.dept" @change="patch({ dept: $event.target.value })">
        <option value="all">All departments</option>
        <option v-for="d in deptOptions" :key="d" :value="d">{{ d }}</option>
      </select>
      <select class="select" :value="filter.artist" @change="patch({ artist: $event.target.value })">
        <option value="all">All artists</option>
        <option v-for="a in artistOptions" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <div v-if="chips.length" class="chipRow">
      <span class="chipLabel">Active filters</span>
      <span v-for="c in chips" :key="c.key" class="chip">
        {{ c.label }}
        <button type="button" title="Remove filter" @click="patch(c.clear)">×</button>
      </span>
      <button v-if="showClearAll" type="button" class="chipClear" @click="clearAll">Clear all</button>
    </div>

    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Shot</th><th>Production</th><th>Dept</th><th>Artist</th><th>Status</th><th>Due</th><th class="num">Days late</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length"><td colspan="7" class="empty">No tasks match this filter.</td></tr>
          <tr
            v-for="(r, i) in rows"
            :key="i"
            class="clickable"
            title="Open this shot in Kitsu"
            @click="openShot(r.projectId, r.shotId)"
          >
            <td class="mono">{{ r.shot }}</td>
            <td>{{ r.projectName }}</td>
            <td>{{ r.dept }}</td>
            <td>{{ r.artist }}</td>
            <td><span class="pill" :class="r.klass">{{ r.status }}</span></td>
            <td>{{ r.due }}</td>
            <td class="num" :class="{ late: r.daysLate > 0 }">{{ r.daysLate == null ? '—' : r.daysLate + 'd' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note">
      "Days late" is negative for tasks not yet due. Overdue = past its due date and not at a done status.
      Click any row to jump straight to that shot in Kitsu.
    </div>
  </div>
</template>
