<script setup>
import { useMetrics } from '../composables/useMetrics.js'
import RecoveryQueueTable from '../components/RecoveryQueueTable.vue'

const { overdueQueue } = useMetrics()
</script>

<template>
  <section>
    <RecoveryQueueTable :rows="overdueQueue" />
  </section>
</template>
