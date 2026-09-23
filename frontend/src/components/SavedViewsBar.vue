<script setup>
import { nextTick, ref } from 'vue'

defineProps({
  views: { type: Array, default: () => [] } // [{ id, name, query, projectId }]
})
const emit = defineEmits(['apply', 'save', 'remove'])

// An inline text field instead of window.prompt() — some browsers block
// native dialogs inside an embedded iframe, and it reads nicer anyway.
const naming = ref(false)
const name = ref('')
const input = ref(null)

async function startNaming() {
  naming.value = true
  name.value = ''
  await nextTick()
  input.value?.focus()
}

function confirmSave() {
  const trimmed = name.value.trim()
  if (trimmed) emit('save', trimmed)
  naming.value = false
}

function cancelNaming() {
  naming.value = false
}
</script>

<template>
  <div class="viewsBar">
    <button
      v-for="v in views"
      :key="v.id"
      type="button"
      class="viewChip"
      :title="'Open the ' + v.name + ' view'"
      @click="emit('apply', v)"
    >
      {{ v.name }}
      <span class="x" title="Delete this view" @click.stop="emit('remove', v.id)">×</span>
    </button>

    <form v-if="naming" class="saveViewForm" @submit.prevent="confirmSave">
      <input
        ref="input"
        v-model="name"
        class="saveViewInput"
        placeholder="View name…"
        maxlength="40"
        @keyup.esc="cancelNaming"
      >
      <button type="submit" class="saveViewBtn">Save</button>
      <button type="button" class="saveViewBtn ghost" @click="cancelNaming">Cancel</button>
    </form>
    <button v-else type="button" class="saveViewBtn" @click="startNaming">+ Save current view</button>
  </div>
</template>
