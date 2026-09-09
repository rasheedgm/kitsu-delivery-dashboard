<script setup>
defineProps({
  data: { type: Object, default: () => ({ today: [], tomorrow: [] }) }
})
</script>

<template>
  <div class="card">
    <div class="head">
      <div class="title">Today's handoffs</div>
      <div class="hint">{{ data.today.length }} today · {{ data.tomorrow.length }} tomorrow</div>
    </div>
    <div class="actionGrid">
      <div class="actionCol">
        <h3>TODAY</h3>
        <div v-if="!data.today.length" class="empty">Nothing due today.</div>
        <div v-for="(r, i) in data.today" :key="'t' + i" class="action">
          <span class="shot">{{ r.shot }} <span class="who">{{ r.artist }} · {{ r.dept }}</span></span>
          <span class="pill" :class="r.klass">{{ r.status }}</span>
        </div>
      </div>
      <div class="actionCol">
        <h3>TOMORROW</h3>
        <div v-if="!data.tomorrow.length" class="empty">Nothing due tomorrow.</div>
        <div v-for="(r, i) in data.tomorrow" :key="'m' + i" class="action">
          <span class="shot">{{ r.shot }} <span class="who">{{ r.artist }} · {{ r.dept }}</span></span>
          <span class="pill" :class="r.klass">{{ r.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
