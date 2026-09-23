<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

// A small "+" trigger that opens a searchable popover list — used both for
// pinning a person onto the board and for scheduling an existing task onto a
// cell. The caller supplies the candidate list and how to search/label it;
// this component only handles the open/search/close mechanics.
const props = defineProps({
  label: { type: String, required: true }, // trigger button content, e.g. "+"
  title: { type: String, default: '' }, // trigger button tooltip
  placeholder: { type: String, default: 'Search…' },
  items: { type: Array, default: () => [] },
  searchKey: { type: Function, required: true }, // (item) => string to match against
  itemKey: { type: Function, default: (item) => item.id ?? item.taskId },
  align: { type: String, default: 'left' } // 'left' | 'right' — which edge the popover hangs from
})
const emit = defineEmits(['select'])

const open = ref(false)
const query = ref('')
const input = ref(null)
const root = ref(null)

async function toggle() {
  open.value = !open.value
  query.value = ''
  if (open.value) {
    await nextTick()
    input.value?.focus()
  }
}
function close() {
  open.value = false
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q ? props.items.filter((i) => props.searchKey(i).toLowerCase().includes(q)) : props.items
  return list.slice(0, 40)
})

function choose(item) {
  emit('select', item)
  close()
}

function onDocClick(event) {
  if (open.value && root.value && !root.value.contains(event.target)) close()
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('mousedown', onDocClick)
  else document.removeEventListener('mousedown', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <span ref="root" class="schedPicker">
    <button type="button" class="schedAddBtn" :title="title" @click="toggle">{{ label }}</button>
    <div v-if="open" class="schedPopover" :class="'align-' + align">
      <input ref="input" v-model="query" class="schedPopoverInput" :placeholder="placeholder">
      <div class="schedPopoverList">
        <div v-if="!filtered.length" class="schedPopoverEmpty">No matches.</div>
        <button
          v-for="item in filtered"
          :key="itemKey(item)"
          type="button"
          class="schedPopoverItem"
          @click="choose(item)"
        >
          <slot :item="item" />
        </button>
      </div>
    </div>
  </span>
</template>
