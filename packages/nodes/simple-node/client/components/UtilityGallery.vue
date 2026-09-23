<script setup lang="ts">
const metrics = [
  { label: 'Events', value: '1,284', change: '+12%' },
  { label: 'Latency', value: '24ms', change: '-8%' },
  { label: 'Success', value: '99.9%', change: '+0.2%' },
]
</script>

<template>
  <section aria-label="Utility gallery" class="space-y-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ metric.label }}
        </p>
        <div class="mt-2 flex items-baseline justify-between gap-2">
          <strong class="truncate text-xl font-semibold tabular-nums">{{ metric.value }}</strong>
          <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">{{
            metric.change
          }}</span>
        </div>
      </article>
    </div>

    <div
      class="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 p-[1px]"
    >
      <div class="rounded-[11px] bg-white p-4 dark:bg-slate-900">
        <div class="flex items-center gap-3">
          <div
            class="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200 dark:bg-indigo-900 dark:text-indigo-200"
            aria-hidden="true"
          >
            ✦
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold leading-6">Wind4 utility coverage</p>
            <p class="text-sm text-slate-600 dark:text-slate-300">
              Layout, spacing, colors, typography, gradients and effects.
            </p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-md bg-sky-100 px-2 py-1 text-xs text-sky-800">flex / grid</span>
          <span class="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800"
            >arbitrary values</span
          >
          <span class="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-800">responsive</span>
          <span class="opacity-50 text-xs">50% opacity</span>
        </div>
      </div>
    </div>
  </section>
</template>
