<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const mounted = ref(true)
const seconds = ref(0)
const mounts = ref(1)
const unmounts = ref(0)
const asyncState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
let timer: ReturnType<typeof setInterval> | undefined
function startTimer() {
  clearInterval(timer)
  timer = setInterval(() => seconds.value++, 1000)
}
function stopTimer() {
  clearInterval(timer)
  timer = undefined
}
function toggleLifecycle() {
  mounted.value = !mounted.value
  if (mounted.value) {
    mounts.value++
    seconds.value = 0
    startTimer()
  } else {
    unmounts.value++
    stopTimer()
  }
}
async function simulate(kind: 'success' | 'error') {
  asyncState.value = 'loading'
  await new Promise(resolve => setTimeout(resolve, 650))
  asyncState.value = kind
}
onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
      <div>
        <h2 class="m-0 text-xs font-semibold">03 · Runtime &amp; Lifecycle</h2>
        <p class="mt-0.5 text-[10px] text-slate-500">Mount cleanup and async state</p>
      </div>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500"
      >
        effects
      </span>
    </header>
    <div class="grid grid-cols-2 divide-x divide-slate-200">
      <div class="p-3.5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-[11px] font-medium text-slate-900">Lifecycle</p>
            <p class="text-[10px] text-slate-500">Timer cleanup</p>
          </div>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            type="button"
            @click="toggleLifecycle"
          >
            {{ mounted ? 'Unmount' : 'Mount' }}
          </button>
        </div>
        <div v-if="mounted" class="mt-3 rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
          <div class="flex items-center justify-between gap-2">
            <strong>● Mounted</strong>
            <strong>{{ seconds }}s</strong>
          </div>
          <p class="text-[10px] text-slate-500">mounts {{ mounts }} · unmounts {{ unmounts }}</p>
        </div>
        <div
          v-else
          class="mt-3 rounded-lg border border-dashed border-slate-300 py-3 text-center text-[10px] text-slate-500"
        >
          Unmounted
        </div>
      </div>
      <div class="p-3.5">
        <p class="text-[11px] font-medium text-slate-900">Async</p>
        <p class="text-[10px] text-slate-500">Loading/success/error</p>
        <div class="mt-3 flex items-center justify-between gap-2">
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 border-slate-200 bg-indigo-600 bg-white px-3 text-xs font-medium text-slate-700 text-white transition hover:bg-indigo-500 hover:bg-slate-50 active:scale-[0.98]"
            type="button"
            @click="simulate('success')"
          >
            Success
          </button>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            type="button"
            @click="simulate('error')"
          >
            Error
          </button>
        </div>
        <div
          class="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600 data-[state=error]:bg-rose-50 data-[state=error]:text-rose-700 data-[state=loading]:bg-amber-50 data-[state=loading]:text-amber-700 data-[state=success]:bg-emerald-50 data-[state=success]:text-emerald-700"
          :data-state="asyncState"
        >
          <span>Status</span>
          <strong>{{ asyncState }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>
