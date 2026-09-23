<script setup>
import { computed } from 'vue'
import { useMetrics } from '../composables/useMetrics.js'
import { useDrillThrough } from '../composables/useDrillThrough.js'
import { CLASS } from '../lib/format.js'
import DeadlineBanner from '../components/DeadlineBanner.vue'
import KpiRow from '../components/KpiRow.vue'
import DonutCard from '../components/DonutCard.vue'
import BarChartCard from '../components/BarChartCard.vue'
import SeverityCard from '../components/SeverityCard.vue'
import HandoffsCard from '../components/HandoffsCard.vue'
import ArtistPressureCard from '../components/ArtistPressureCard.vue'

const {
  kpis,
  deadline,
  statusSegments,
  deliveryLoad,
  severity,
  handoffs,
  artistPressure,
  rows,
  shotRows,
  shotKpis,
  shotStatusSegments,
  shotQuota,
  shotQuotaSegments,
  shotStatusDeptName
} = useMetrics()

const { goToQueue } = useDrillThrough()

const trackedTotal = computed(() => rows.value.length)
const shotsTotal = computed(() => shotRows.value.length)

// Narrow a Shots Overview click to exactly the tasks that decide shot status,
// when the studio has configured which task type that is.
function goToShotsQueue(patch) {
  goToQueue(shotStatusDeptName.value ? { ...patch, dept: shotStatusDeptName.value } : patch)
}

function onShotQuotaSegment(segment) {
  goToShotsQueue(segment.key === 'done' ? { due: 'week', status: CLASS.DONE } : { due: 'week' })
}
</script>

<template>
  <section>
    <DeadlineBanner :deadline="deadline" :overdue="shotKpis.overdue" />

    <div class="sectionHead">
      <b>Shots overview</b>
      <span v-if="shotStatusDeptName">shot status = the shot's "{{ shotStatusDeptName }}" task · set in Settings</span>
      <span v-else>shot status = each shot's last-scheduled task · set a specific task type in Settings</span>
    </div>
    <KpiRow :k="shotKpis" @select="goToShotsQueue" />

    <div class="grid2">
      <DonutCard
        title="Shot status"
        :hint="shotsTotal + ' shots'"
        :center-value="shotsTotal"
        center-label="shots"
        :segments="shotStatusSegments"
        clickable
        note="One representative task per shot (see the Shots overview note above). Click a status to open those shots' tasks in the queue."
        @select="(s) => goToShotsQueue({ status: s.key, due: 'all' })"
      />
      <DonutCard
        title="Weekly quota (shots)"
        hint="current ISO week"
        :center-value="shotQuota.pct + '%'"
        center-label="progress"
        :segments="shotQuotaSegments"
        clickable
        :note="`${shotQuota.done} shots delivered, ${shotQuota.remaining} remaining of ${shotQuota.total} due this week.`"
        @select="onShotQuotaSegment"
      />
    </div>

    <div class="sectionHead">
      <b>Task overview</b>
      <span>every shot task, across all departments</span>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="kpis" style="margin-bottom:0">
        <div class="kpi red clickable" @click="goToQueue({ due: 'overdue' })"><div class="kl">Overdue</div><div class="kv">{{ kpis.overdue }}</div></div>
        <div class="kpi amber clickable" @click="goToQueue({ due: 'today' })"><div class="kl">Due today</div><div class="kv">{{ kpis.dueToday }}</div></div>
        <div class="kpi amber clickable" @click="goToQueue({ status: CLASS.NOT_STARTED, due: 'all' })"><div class="kl">Not started</div><div class="kv">{{ kpis.notStarted }}</div></div>
        <div class="kpi blue clickable" @click="goToQueue({ status: CLASS.RETAKE, due: 'all' })"><div class="kl">Retake / client retake</div><div class="kv">{{ kpis.retakes }}</div></div>
        <div class="kpi clickable" @click="goToQueue({ due: 'week' })"><div class="kl">Weekly remaining</div><div class="kv">{{ kpis.quotaRemaining }}</div></div>
        <div class="kpi green clickable" @click="goToQueue({ status: CLASS.DONE, due: 'all' })"><div class="kl">Delivered</div><div class="kv">{{ kpis.delivered }}</div></div>
      </div>
    </div>

    <div class="grid2">
      <DonutCard
        title="Overall task status"
        :hint="trackedTotal + ' shot tasks'"
        :center-value="trackedTotal"
        center-label="tasks"
        :segments="statusSegments"
        clickable
        note="Status is classified from Kitsu task-status flags (done / retake / todo), with a name fallback for studio-specific statuses. Click a status to open it in the queue."
        @select="(s) => goToQueue({ status: s.key, due: 'all' })"
      />
      <ArtistPressureCard :artists="artistPressure" @select="goToQueue" />
    </div>

    <div class="grid3">
      <BarChartCard :buckets="deliveryLoad" @select="goToQueue" />
      <SeverityCard :buckets="severity" @select="goToQueue" />
    </div>

    <div style="margin-bottom:12px"><HandoffsCard :data="handoffs" /></div>
  </section>
</template>
