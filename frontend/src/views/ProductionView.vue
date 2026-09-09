<script setup>
import { computed } from 'vue'
import { useMetrics } from '../composables/useMetrics.js'
import DonutCard from '../components/DonutCard.vue'
import DepartmentPipeline from '../components/DepartmentPipeline.vue'
import StatusMatrix from '../components/StatusMatrix.vue'

const { departments, statusMatrix, rows } = useMetrics()

const executionSegments = computed(() => {
  const t = departments.value.reduce(
    (acc, d) => ({
      inProgress: acc.inProgress + d.inProgress,
      done: acc.done + d.done,
      notStarted: acc.notStarted + d.notStarted
    }),
    { inProgress: 0, done: 0, notStarted: 0 }
  )
  return [
    { label: 'In progress', count: t.inProgress, color: 'var(--blue)' },
    { label: 'Not started', count: t.notStarted, color: 'var(--slate)' },
    { label: 'Delivered', count: t.done, color: 'var(--green)' }
  ]
})

const inProgressTotal = computed(() => executionSegments.value[0].count)
</script>

<template>
  <section>
    <div class="grid2">
      <DonutCard
        title="Department execution"
        :hint="rows.length + ' tasks'"
        :center-value="inProgressTotal + '/' + rows.length"
        center-label="in progress"
        :segments="executionSegments"
        note="Required = every shot task of that department. In progress = anything not at a todo or done status."
      />
      <DepartmentPipeline :departments="departments" />
    </div>
    <StatusMatrix :matrix="statusMatrix" />
  </section>
</template>
