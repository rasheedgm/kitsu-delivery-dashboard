<script setup>
import { computed } from 'vue'

const props = defineProps({
  artists: { type: Array, default: () => [] } // [{ name, count }] sorted desc
})
const emit = defineEmits(['select'])

const top = computed(() => props.artists.slice(0, 8))
const max = computed(() => Math.max(1, ...top.value.map((a) => a.count)))
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Overdue pressure by artist</div>
      <div class="hint">overdue tasks per assignee</div>
    </div>
    <div v-if="!top.length" class="empty">No overdue tasks.</div>
    <div v-else class="artistGrid">
      <div
        v-for="a in top"
        :key="a.name"
        class="artist clickable"
        @click="emit('select', { due: 'overdue', artist: a.name })"
      >
        <div class="artistTop"><b>{{ a.name }}</b><b>{{ a.count }}</b></div>
        <div class="mini"><i :style="{ width: (a.count / max) * 100 + '%' }"></i></div>
      </div>
    </div>
  </div>
</template>
