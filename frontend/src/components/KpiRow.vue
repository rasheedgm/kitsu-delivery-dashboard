<script setup>
defineProps({ k: { type: Object, required: true } })
</script>

<template>
  <div class="kpis">
    <div class="kpi red">
      <div class="kl">Overdue deliveries</div>
      <div class="kv">{{ k.overdue }}</div>
      <div class="km">past due, not delivered</div>
    </div>
    <div class="kpi amber">
      <div class="kl">Not started</div>
      <div class="kv">{{ k.notStarted }}</div>
      <div class="km">tasks still to do</div>
    </div>
    <div class="kpi blue">
      <div class="kl">Due today</div>
      <div class="kv">{{ k.dueToday }}</div>
      <div class="km">deliveries scheduled today</div>
    </div>
    <div class="kpi">
      <div class="kl">Shots in scope</div>
      <div class="kv">{{ k.shotsInScope }}</div>
      <div class="km">across selected productions</div>
    </div>
    <div class="kpi green">
      <div class="kl">Delivered</div>
      <div class="kv">{{ k.delivered }}</div>
      <div class="km">tasks at a done status</div>
    </div>
    <div class="kpi purple">
      <div class="kl">Weekly quota</div>
      <div class="kv">{{ k.quotaPct }}%</div>
      <div class="km">{{ k.quotaDone }} of {{ k.quotaTotal }} · {{ k.quotaRemaining }} left</div>
    </div>
  </div>
</template>
