<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

// A small "+" trigger that opens a searchable popover list — used both for
// pinning a person onto the board and for scheduling an existing task onto a
// cell. The caller supplies the candidate list and how to search/label it;
// this component only handles the open/search/close/position mechanics.
//
// The popover is teleported to <body> and positioned with `fixed` from the
// trigger's own bounding rect, rather than sitting absolutely inside the
// cell — the schedule board scrolls (`.schedBoard{overflow:auto}`), and an
// absolutely-positioned popover nested inside a scroll container gets
// clipped by it instead of floating on top.
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
const trigger = ref(null)
const popover = ref(null)
const popoverStyle = ref({})

const POPOVER_WIDTH = 260

function position() {
  const rect = trigger.value.getBoundingClientRect()
  let left = props.align === 'right' ? rect.right - POPOVER_WIDTH : rect.left
  left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
  const top = Math.min(rect.bottom + 4, window.innerHeight - 60)
  popoverStyle.value = { top: `${top}px`, left: `${left}px`, width: `${POPOVER_WIDTH}px` }
}

async function toggle() {
  open.value = !open.value
  query.value = ''
  if (open.value) {
    await nextTick()
    position()
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
  if (!open.value) return
  if (trigger.value?.contains(event.target)) return
  if (popover.value?.contains(event.target)) return
  close()
}
// The board scrolls internally; rather than continuously reposition, just
// close on scroll/resize so a stale-positioned popover is never left behind.
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
  } else {
    document.removeEventListener('mousedown', onDocClick)
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <span class="schedPicker">
    <button ref="trigger" type="button" class="schedAddBtn" :title="title" @click="toggle">{{ label }}</button>
    <Teleport to="body">
      <div v-if="open" ref="popover" class="schedPopover" :style="popoverStyle">
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
    </Teleport>
  </span>
</template>
