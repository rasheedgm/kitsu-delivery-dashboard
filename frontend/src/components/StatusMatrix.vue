<script setup>
defineProps({
  matrix: { type: Object, required: true } // from metrics.statusMatrix()
})
const emit = defineEmits(['select'])
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Project status matrix</div>
      <div class="hint">tasks by department &amp; status · click a cell to open it · {{ matrix.grandTotal }} total</div>
    </div>
    <div class="tableWrap" style="max-height:none">
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th
              v-for="c in matrix.classes"
              :key="c.key"
              class="num clickable"
              @click="matrix.colTotals[c.key] > 0 && emit('select', { status: c.key, due: 'all' })"
            >{{ c.label }}</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="type in matrix.types" :key="type">
            <td class="clickable" @click="matrix.rowTotals[type] > 0 && emit('select', { dept: type, due: 'all' })">{{ type }}</td>
            <td
              v-for="c in matrix.classes"
              :key="c.key"
              class="num"
              :class="{ clickable: matrix.cells[type][c.key] > 0 }"
              @click="matrix.cells[type][c.key] > 0 && emit('select', { dept: type, status: c.key, due: 'all' })"
            >{{ matrix.cells[type][c.key] }}</td>
            <td
              class="num clickable"
              @click="matrix.rowTotals[type] > 0 && emit('select', { dept: type, due: 'all' })"
            ><b>{{ matrix.rowTotals[type] }}</b></td>
          </tr>
          <tr>
            <td><b>Total</b></td>
            <td
              v-for="c in matrix.classes"
              :key="c.key"
              class="num clickable"
              @click="matrix.colTotals[c.key] > 0 && emit('select', { status: c.key, due: 'all' })"
            ><b>{{ matrix.colTotals[c.key] }}</b></td>
            <td class="num"><b>{{ matrix.grandTotal }}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
