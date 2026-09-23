<script setup>
import { CLASS } from '../lib/format.js'

// `k` is a shot-level kpis() result (see lib/metrics.js buildShotRows + the
// composables/useMetrics.js shotKpis computed): one representative task per
// shot, chosen per the studio's Settings.
defineProps({ k: { type: Object, required: true } })
const emit = defineEmits(['select'])
</script>

<template>
  <div class="kpis kpis7">
    <div class="kpi red clickable" @click="emit('select', { due: 'overdue' })">
      <div class="kl">Overdue</div>
      <div class="kv">{{ k.overdue }}</div>
      <div class="km">shots past due, not delivered</div>
    </div>
    <div class="kpi amber clickable" @click="emit('select', { status: CLASS.NOT_STARTED, due: 'all' })">
      <div class="kl">Not started</div>
      <div class="kv">{{ k.notStarted }}</div>
      <div class="km">shots still to start</div>
    </div>
    <div class="kpi blue clickable" @click="emit('select', { due: 'today' })">
      <div class="kl">Due today</div>
      <div class="kv">{{ k.dueToday }}</div>
      <div class="km">shots scheduled today</div>
    </div>
    <div class="kpi">
      <div class="kl">Shots in scope</div>
      <div class="kv">{{ k.shotsInScope }}</div>
      <div class="km">across selected productions</div>
    </div>
    <div class="kpi blue clickable" @click="emit('select', { status: CLASS.RETAKE, due: 'all' })">
      <div class="kl">Retake</div>
      <div class="kv">{{ k.retakes }}</div>
      <div class="km">shots in retake / client retake</div>
    </div>
    <div class="kpi green clickable" @click="emit('select', { status: CLASS.DONE, due: 'all' })">
      <div class="kl">Delivered</div>
      <div class="kv">{{ k.delivered }}/{{ k.shotsInScope }}</div>
      <div class="km">shots at a delivered status</div>
    </div>
    <div class="kpi purple clickable" @click="emit('select', { due: 'week' })">
      <div class="kl">Weekly quota</div>
      <div class="kv">{{ k.quotaPct }}%</div>
      <div class="km">{{ k.quotaDone }} of {{ k.quotaTotal }} · {{ k.quotaRemaining }} left</div>
    </div>
  </div>
</template>
