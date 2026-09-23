<script setup lang="ts">
import { computed } from 'vue'
import UtilityGallery from './components/UtilityGallery.vue'
import VariantPlayground from './components/VariantPlayground.vue'
import ScopedDialog from './components/ScopedDialog.vue'
import { useHydrateStore } from './hydrate'

const { name } = useHydrateStore().refs
const title = computed(() => name.value || 'simple-node')
</script>

<template>
  <main
    class="mx-auto flex max-w-3xl flex-col gap-6 rounded-xl bg-white p-4 text-slate-900 sm:p-6 dark:bg-slate-900 dark:text-slate-100"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700"
    >
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300"
        >
          Flowup · UnoCSS Wind4
        </p>
        <h2 class="mt-1 text-2xl font-bold tracking-tight">{{ title }}</h2>
      </div>
      <span
        class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
        >Scoped editor</span
      >
    </header>

    <UtilityGallery />
    <VariantPlayground />
    <ScopedDialog />
  </main>
</template>
