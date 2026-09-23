<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const active = shallowRef(false)
const buttonClasses = computed(() =>
  active.value ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700',
)

function toggle() {
  active.value = !active.value
}
</script>

<template>
  <section
    aria-label="Variant playground"
    class="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
  >
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        data-testid="toggle"
        :aria-pressed="active"
        :class="buttonClasses"
        class="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 active:scale-95"
        @click="toggle"
      >
        {{ active ? 'Active' : 'Activate' }}
      </button>
      <span data-testid="status" class="text-sm text-slate-600 dark:text-slate-300">{{
        active ? 'Enabled' : 'Idle'
      }}</span>
      <span class="size-3 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
    </div>

    <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
      Label
      <input
        class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
        placeholder="Focus to inspect the ring"
      />
    </label>
    <div class="group flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
      <span
        class="size-2 rounded-full bg-slate-400 transition-colors group-hover:bg-emerald-500"
        aria-hidden="true"
      />
      <span class="text-xs text-slate-600 group-hover:text-slate-900 dark:text-slate-300"
        >Hover this row to inspect group variants</span
      >
    </div>
    <p
      class="text-[13px] leading-[1.6] text-slate-500 first-letter:font-bold first-letter:text-indigo-600"
    >
      Arbitrary values and pseudo variants stay inside this scope.
    </p>
  </section>
</template>
