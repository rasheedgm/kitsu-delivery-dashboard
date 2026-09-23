<script setup>
import { ref, watch } from 'vue'
import { useDashboardData } from '../composables/useDashboardData.js'
import { useSettings } from '../composables/useSettings.js'

const { state: dashboard } = useDashboardData()
const { state: settings, save } = useSettings()

const form = ref({ shotStatusTaskTypeId: '', deliveredStatusIds: [], retakeStatusIds: [] })

// Re-sync the editable form whenever the loaded/saved settings change —
// harmless while editing since a save() only fires after the form is
// already what we're about to persist.
watch(
  () => [settings.shotStatusTaskTypeId, settings.deliveredStatusIds, settings.retakeStatusIds],
  () => {
    form.value = {
      shotStatusTaskTypeId: settings.shotStatusTaskTypeId || '',
      deliveredStatusIds: [...settings.deliveredStatusIds],
      retakeStatusIds: [...settings.retakeStatusIds]
    }
  },
  { immediate: true }
)

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
      retakeStatusIds: form.value.retakeStatusIds
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
