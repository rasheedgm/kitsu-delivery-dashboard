<script setup>
import { computed, ref, watch } from 'vue'
import { useDashboardData } from '../composables/useDashboardData.js'
import { useSettings } from '../composables/useSettings.js'

const { state: dashboard } = useDashboardData()
const { state: settings, save } = useSettings()

const form = ref({ shotStatusTaskTypeId: '', deliveredStatusIds: [], retakeStatusIds: [], ignoredTaskTypeIds: [] })

// Re-sync the editable form whenever the loaded/saved settings change —
// harmless while editing since a save() only fires after the form is
// already what we're about to persist.
watch(
  () => [settings.shotStatusTaskTypeId, settings.deliveredStatusIds, settings.retakeStatusIds, settings.ignoredTaskTypeIds],
  () => {
    form.value = {
      shotStatusTaskTypeId: settings.shotStatusTaskTypeId || '',
      deliveredStatusIds: [...settings.deliveredStatusIds],
      retakeStatusIds: [...settings.retakeStatusIds],
      ignoredTaskTypeIds: [...settings.ignoredTaskTypeIds]
    }
  },
  { immediate: true }
)

// Shot task types only (the dashboard tracks shots), each with how many tasks
// of that type exist today so it's obvious what ticking it will hide. A type
// that's already ticked always stays listed, so it can be un-ticked.
const ignorableTypes = computed(() => {
  const counts = {}
  for (const r of dashboard.rows) counts[r.taskTypeId] = (counts[r.taskTypeId] || 0) + 1
  return dashboard.taskTypes
    .filter((t) => !t.for_entity || t.for_entity === 'Shot' || form.value.ignoredTaskTypeIds.includes(t.id))
    .map((t) => ({ ...t, count: counts[t.id] || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function toggle(list, id) {
  const i = list.indexOf(id)
  if (i === -1) list.push(id)
  else list.splice(i, 1)
}

const saveError = ref(null)
const saved = ref(false)

async function onSave() {
  saveError.value = null
  saved.value = false
  try {
    await save({
      shotStatusTaskTypeId: form.value.shotStatusTaskTypeId || null,
      deliveredStatusIds: form.value.deliveredStatusIds,
      retakeStatusIds: form.value.retakeStatusIds,
      ignoredTaskTypeIds: form.value.ignoredTaskTypeIds
    })
    saved.value = true
  } catch (err) {
    saveError.value = err?.message || String(err)
  }
}
</script>

<template>
  <section>
    <div class="card">
      <div class="head">
        <div class="title">Shot status settings</div>
        <div class="hint">studio-wide · {{ dashboard.isAdmin ? 'admin/manager' : 'view only' }}</div>
      </div>

      <div v-if="settings.error" class="bigNote" style="color:var(--red)">
        Couldn't load saved settings ({{ settings.error }}) — showing defaults. If this plugin
        was recently updated, the backend may need reinstalling (see INSTALL-PORTAINER.md).
      </div>

      <div class="settingsBlock">
        <div class="settingsLabel">Which task represents a shot's overall status?</div>
        <p class="settingsHint">
          Used for the "Shots overview" cards and the shot-status donut on the Overview tab.
          Pick the task type your studio treats as the shot's final word — e.g. "Client
          Delivery". Leave unset to fall back to each shot's chronologically last task.
        </p>
        <select v-model="form.shotStatusTaskTypeId" class="select" :disabled="!dashboard.isAdmin">
          <option value="">— Use last-scheduled task (default) —</option>
          <option v-for="t in dashboard.taskTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>

      <div class="settingsBlock">
        <div class="settingsLabel">Which statuses count as "Delivered"?</div>
        <p class="settingsHint">
          Defaults to Kitsu's own "done" status flag when nothing is picked here.
        </p>
        <div class="statusPicker">
          <label v-for="s in dashboard.taskStatuses" :key="s.id" class="statusOption">
            <input
              type="checkbox"
              :disabled="!dashboard.isAdmin"
              :checked="form.deliveredStatusIds.includes(s.id)"
              @change="toggle(form.deliveredStatusIds, s.id)"
            >
            <span class="swatch" :style="{ background: s.color }"></span>{{ s.name }}
          </label>
        </div>
      </div>

      <div class="settingsBlock">
        <div class="settingsLabel">Which statuses count as "Retake"?</div>
        <p class="settingsHint">
          Defaults to Kitsu's own "retake" flag (and any status named with "retake") when
          nothing is picked here.
        </p>
        <div class="statusPicker">
          <label v-for="s in dashboard.taskStatuses" :key="s.id" class="statusOption">
            <input
              type="checkbox"
              :disabled="!dashboard.isAdmin"
              :checked="form.retakeStatusIds.includes(s.id)"
              @change="toggle(form.retakeStatusIds, s.id)"
            >
            <span class="swatch" :style="{ background: s.color }"></span>{{ s.name }}
          </label>
        </div>
      </div>

      <div class="settingsBlock">
        <div class="settingsLabel">Ignore these task types</div>
        <p class="settingsHint">
          Tasks of a ticked type are left out of every number and list on the dashboard —
          Task overview, Production, the Task queue, and which task represents a shot. Use it
          for dummy or bookkeeping tasks that aren't production tracking. The Schedule board
          still shows them (they're still scheduled work).
        </p>
        <div class="statusPicker">
          <label v-for="t in ignorableTypes" :key="t.id" class="statusOption">
            <input
              type="checkbox"
              :disabled="!dashboard.isAdmin"
              :checked="form.ignoredTaskTypeIds.includes(t.id)"
              @change="toggle(form.ignoredTaskTypeIds, t.id)"
            >
            <span class="swatch" :style="{ background: t.color || 'var(--slate)' }"></span>{{ t.name }}
            <span class="count">· {{ t.count }}</span>
          </label>
        </div>
      </div>

      <div v-if="dashboard.isAdmin" class="settingsActions">
        <button type="button" class="saveViewBtn primary" :disabled="settings.saving" @click="onSave">
          {{ settings.saving ? 'Saving…' : 'Save settings' }}
        </button>
        <span v-if="saved" class="savedNote">Saved — everyone's dashboard now uses this.</span>
        <span v-if="saveError" class="savedNote err">{{ saveError }}</span>
      </div>
      <div v-else class="note">Only studio admins/managers can change these settings.</div>
    </div>
  </section>
</template>
