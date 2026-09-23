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
  quota,
  quotaSegments,
  deliveryLoad,
  severity,
  handoffs,
  artistPressure,
  rows
} = useMetrics()

const { goToQueue } = useDrillThrough()

const trackedTotal = computed(() => rows.value.length)

function onQuotaSegment(segment) {
  goToQueue(segment.key === 'done' ? { due: 'week', status: CLASS.DONE } : { due: 'week' })
}
</script>

<template>
  <section>
    <DeadlineBanner :deadline="deadline" :overdue="kpis.overdue" />
    <KpiRow :k="kpis" @select="goToQueue" />

    <div class="card" style="margin-bottom:12px">
      <div class="head"><div class="title">Project alerts</div><div class="hint">click any figure to open it in the queue</div></div>
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
      <DonutCard
        title="Weekly quota"
        hint="current ISO week"
        :center-value="quota.pct + '%'"
        center-label="progress"
        :segments="quotaSegments"
        clickable
        :note="`Quota = tasks with a due date in this week. ${quota.done} delivered, ${quota.remaining} remaining of ${quota.total}. Click to open in the queue.`"
        @select="onQuotaSegment"
      />
    </div>

    <div class="grid3">
      <BarChartCard :buckets="deliveryLoad" @select="goToQueue" />
      <SeverityCard :buckets="severity" @select="goToQueue" />
    </div>

    <div class="grid2">
      <HandoffsCard :data="handoffs" />
      <ArtistPressureCard :artists="artistPressure" @select="goToQueue" />
    </div>
  </section>
</template>
