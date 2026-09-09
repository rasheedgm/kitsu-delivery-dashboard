<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  hint: String,
  centerValue: [String, Number],
  centerLabel: String,
  segments: { type: Array, default: () => [] }, // [{ label, count, color }]
  note: String
})

const total = computed(() => props.segments.reduce((sum, s) => sum + s.count, 0))

const gradient = computed(() => {
  if (!total.value) return 'var(--line)'
  let acc = 0
  const stops = []
  for (const s of props.segments) {
    const start = (acc / total.value) * 100
    acc += s.count
    const end = (acc / total.value) * 100
    stops.push(`${s.color} ${start}% ${end}%`)
  }
  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">{{ title }}</div>
      <div v-if="hint" class="hint">{{ hint }}</div>
    </div>
    <div class="visuals">
      <div class="donutWrap">
        <div class="donut" :style="{ background: gradient }">
          <div class="donutCenter">
            <div>
              <b>{{ centerValue }}</b>
              <span>{{ centerLabel }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="legend">
        <div v-for="s in segments" :key="s.label" class="leg">
          <span><i class="swatch" :style="{ background: s.color }"></i>{{ s.label }}</span>
          <b>{{ s.count }}</b>
        </div>
      </div>
    </div>
    <div v-if="note" class="bigNote">{{ note }}</div>
  </div>
</template>
