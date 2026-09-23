<script setup>
import { computed } from 'vue'
import { isoKey } from '../lib/format.js'

const props = defineProps({
  buckets: { type: Array, default: () => [] } // [{ date, label, count, done, isToday }]
})
const emit = defineEmits(['select'])

const max = computed(() => Math.max(1, ...props.buckets.map((b) => b.count)))
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Delivery load</div>
      <div class="hint">today + next 6 days</div>
    </div>
    <div class="barChart">
      <div
        v-for="b in buckets"
        :key="b.label"
        class="barCol"
        :class="{ clickable: b.count > 0 }"
        @click="b.count > 0 && emit('select', { due: isoKey(b.date) })"
      >
        <div class="barVal">{{ b.count }}</div>
        <div class="barArea">
          <div
            class="bar"
            :class="{ hot: b.isToday && b.count, zero: !b.count }"
            :style="{ height: b.count ? (b.count / max) * 100 + '%' : undefined }"
          ></div>
        </div>
        <div class="barLabel">{{ b.label }}</div>
      </div>
    </div>
    <div class="legendRow"><span>Bars = tasks due that day</span><span>Today highlighted</span></div>
  </div>
</template>
