<script setup>
import { computed } from 'vue'
import { useMetrics } from '../composables/useMetrics.js'
import { useDrillThrough } from '../composables/useDrillThrough.js'
import { CLASS } from '../lib/format.js'
import DonutCard from '../components/DonutCard.vue'
import DepartmentPipeline from '../components/DepartmentPipeline.vue'
import StatusMatrix from '../components/StatusMatrix.vue'

const { departments, statusMatrix, rows } = useMetrics()
const { goToQueue } = useDrillThrough()

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
    { key: null, label: 'In progress', count: t.inProgress, color: 'var(--blue)' },
    { key: CLASS.NOT_STARTED, label: 'Not started', count: t.notStarted, color: 'var(--slate)' },
    { key: CLASS.DONE, label: 'Delivered', count: t.done, color: 'var(--green)' }
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
        clickable
        note="Required = every shot task of that department. In progress = anything not at a todo or done status."
        @select="(s) => goToQueue({ status: s.key, due: 'all' })"
      />
      <DepartmentPipeline :departments="departments" @select="goToQueue" />
    </div>
    <StatusMatrix :matrix="statusMatrix" @select="goToQueue" />
  </section>
</template>
