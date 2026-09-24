<script setup lang="ts">
import { ref } from 'vue'
import { useHydrateStore } from '../hydrate'
import ChildValue from './ChildValue.vue'

const { items } = useHydrateStore().refs
const count = ref(0)
const childValue = ref(3)
const showList = ref(true)

function addItem() {
  items.value = [...items.value, `Item ${items.value.length + 1}`]
}

function removeItem(index: number) {
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index)
}
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
      <div>
        <h2 class="m-0 text-xs font-semibold">02 · Reactive Behavior</h2>
        <p class="mt-0.5 text-[10px] text-slate-500">
          State, rendering and component communication
        </p>
      </div>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500"
      >
        runtime only
      </span>
    </header>
    <div class="flex items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-3">
      <div>
        <p class="text-[11px] font-medium text-slate-900">Local counter</p>
        <p class="text-[10px] text-slate-500">State + click events</p>
      </div>
      <div class="flex items-center justify-between gap-2">
        <button
          class="inline-flex size-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-0 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          type="button"
          aria-label="Decrement"
          @click="count--"
        >
          −
        </button>
        <strong>{{ count }}</strong>
        <button
          class="inline-flex size-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-0 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          type="button"
          aria-label="Increment"
          @click="count++"
        >
          +
        </button>
      </div>
    </div>
    <div class="border-t border-slate-200 px-3.5 py-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-[11px] font-medium text-slate-900">Conditional list</p>
          <p class="text-[10px] text-slate-500">Keyed rendering + add/remove</p>
        </div>
        <div class="flex items-center justify-between gap-2">
          <label class="text-[10px] text-slate-500">
            <input v-model="showList" type="checkbox" /> Show
          </label>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            type="button"
            @click="addItem"
          >
            + Add
          </button>
        </div>
      </div>
      <ul v-if="showList" class="mt-2.5 flex flex-wrap gap-1.5">
        <li v-for="(item, index) in items" :key="`${item}-${index}`">
          {{ item }}
          <button
            type="button"
            :aria-label="`Remove ${item}`"
            @click="removeItem(index)"
          >
            ×
          </button>
        </li>
      </ul>
      <p v-else class="text-[10px] text-slate-500">List hidden</p>
    </div>
    <div class="flex items-center justify-between gap-2 border-t border-slate-200 px-3.5 py-3">
      <div>
        <p class="text-[11px] font-medium text-slate-900">Child component</p>
        <p class="text-[10px] text-slate-500">Parent value → child · child event → parent</p>
      </div>
      <ChildValue :value="childValue" @increment="childValue++" />
    </div>
  </section>
</template>
