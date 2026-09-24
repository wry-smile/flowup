<script lang="ts" setup>
import { computed, ref } from "vue";
import { useHydrateStore } from "./hydrate";
import { t } from './i18n'
import { features, resourceUrl, tones } from '@client-shared/showcase'
const hydrateStore = useHydrateStore();
const { name } = hydrateStore.refs;
const title = computed(() => name.value || "framework-gallery-vue-node");
const selected = ref(0)
const showDetails = ref(false)
</script>

<template>
  <section class="grid gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
    <div class="flex items-center gap-3">
      <img class="h-10 w-10 rounded-lg" :src="resourceUrl('vue-node', 'badge.svg')" alt="Vue badge">
      <div><h3 class="text-lg font-bold text-indigo-900 dark:text-indigo-100">Vue editor</h3><p class="text-xs text-indigo-600">{{ title }}</p></div>
    </div>
    <label class="grid gap-1 text-sm font-medium" for="node-input-name">{{ t('label.name') }}
      <input id="node-input-name" v-model="name" class="rounded-lg border border-indigo-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
    </label>
    <div class="flex flex-wrap gap-2" role="group" aria-label="Color tone">
      <button v-for="(tone, index) in tones" :key="tone.label" type="button" :class="tone.className" class="rounded-full px-3 py-1 text-sm ring-1 transition hover:scale-105" :aria-pressed="selected === index" @click="selected = index">{{ tone.label }}</button>
    </div>
    <button type="button" class="w-fit rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700" :aria-expanded="showDetails" @click="showDetails = !showDetails">Toggle features</button>
    <ul v-if="showDetails" class="grid gap-1 rounded-lg bg-white p-3 text-sm text-slate-700"><li v-for="feature in features" :key="feature">✓ {{ feature }}</li></ul>
  </section>
</template>
