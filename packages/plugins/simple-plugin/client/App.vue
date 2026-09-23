<script lang="ts" setup>
import { computed } from "vue";
import { useHydrateStore } from "./hydrate";
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "simple-plugin");
</script>

<template>
  <div class="flowup-plugin-panel rounded-lg p-4">
    <h3>{{ title }}</h3>
    <p>Vue plugin scaffold for simple-plugin.</p>
  </div>
</template>

<style scoped>
.flowup-plugin-panel {
  padding: 12px;
}
</style>
