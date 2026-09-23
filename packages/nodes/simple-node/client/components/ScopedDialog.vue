<script setup lang="ts">
import { shallowRef } from 'vue'

const open = shallowRef(false)
</script>

<template>
  <section aria-label="Scoped overlay">
    <button
      type="button"
      data-testid="open-dialog"
      class="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
      @click="open = true"
    >
      Open scoped overlay
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        data-flowup-scope="simple-node"
        data-testid="dialog-scope"
        class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scoped overlay example"
          class="w-full max-w-sm rounded-xl bg-white p-5 text-slate-900 shadow-xl"
        >
          <h3 class="text-lg font-semibold">Scoped overlay</h3>
          <p class="mt-2 text-sm text-slate-600">
            The teleported container carries the same scope attribute.
          </p>
          <button
            type="button"
            data-testid="close-dialog"
            class="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            @click="open = false"
          >
            Close
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>
