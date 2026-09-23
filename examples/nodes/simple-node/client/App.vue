<script lang="ts" setup>
import { computed } from "vue";
import { useHydrateStore } from "./hydrate";
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "simple-node");
</script>

<template>
  <div class="flowup-panel rounded-lg p-4">
    <h3>{{ title }}</h3>
    <p>Vue editor scaffold for simple-node.</p>
  </div>
</template>

<style scoped>
.flowup-panel {
  padding: 12px;
}
</style>
