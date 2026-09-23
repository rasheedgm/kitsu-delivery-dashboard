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

// "Shareable" means this iframe's own URL (window.location.href), not the
// Kitsu page's address bar — Kitsu embeds the dashboard in an iframe, so the
// browser's address bar always shows Kitsu's fixed plugin URL and never
// reflects what's selected in here. Pasted into a *new* browser tab, this
// link reopens the same session (same login cookie) at the same filter.
const linkStatus = ref('idle') // idle | copied | manual
const linkUrl = ref('')
let resetTimer = null

async function onCopyLink() {
  linkUrl.value = window.location.href
  try {
    await navigator.clipboard.writeText(linkUrl.value)
    linkStatus.value = 'copied'
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      linkStatus.value = 'idle'
    }, 2500)
  } catch {
    // Clipboard access can be blocked inside an embedded iframe — fall back
    // to a selectable field instead of failing silently.
    linkStatus.value = 'manual'
  }
}

function selectLinkText(event) {
  event.target.select()
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

    <button
      type="button"
      class="saveViewBtn"
      title="Copy a link to this exact filter — paste it into a new browser tab (not Kitsu's own address bar, which won't show it)"
      @click="onCopyLink"
    >{{ linkStatus === 'copied' ? 'Copied!' : 'Copy link to this view' }}</button>
    <span class="viewsHint">Kitsu embeds this page, so its own address bar won't show your filter — use "Copy link" or a saved view instead.</span>
  </div>
  <div v-if="linkStatus === 'manual'" class="manualLink">
    <span>Clipboard access is blocked here — select and copy manually:</span>
    <input readonly class="manualLinkInput" :value="linkUrl" @click="selectLinkText">
  </div>
</template>
