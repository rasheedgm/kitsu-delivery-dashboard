<script setup>
defineProps({
  matrix: { type: Object, required: true } // from metrics.statusMatrix()
})
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Project status matrix</div>
      <div class="hint">tasks by department &amp; status · {{ matrix.grandTotal }} total</div>
    </div>
    <div class="tableWrap" style="max-height:none">
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th v-for="c in matrix.classes" :key="c.key" class="num">{{ c.label }}</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="type in matrix.types" :key="type">
            <td>{{ type }}</td>
            <td v-for="c in matrix.classes" :key="c.key" class="num">{{ matrix.cells[type][c.key] }}</td>
            <td class="num"><b>{{ matrix.rowTotals[type] }}</b></td>
          </tr>
          <tr>
            <td><b>Total</b></td>
            <td v-for="c in matrix.classes" :key="c.key" class="num"><b>{{ matrix.colTotals[c.key] }}</b></td>
            <td class="num"><b>{{ matrix.grandTotal }}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
