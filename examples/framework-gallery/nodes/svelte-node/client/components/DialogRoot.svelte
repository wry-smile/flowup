<script lang="ts">
import { portal } from './portal'

export let open = false
export let onClose: () => void
</script>

<svelte:window onkeydown={event => event.key === 'Escape' && open && onClose()} />

{#if open}
  <div use:portal data-flowup-scope="framework-gallery">
    <div
      class="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
      onclick={event => event.target === event.currentTarget && onClose()}
    >
      <div
        class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flowup-overlay-title"
        tabindex="-1"
      >
        <header>
          <div>
            <h2
              id="flowup-overlay-title"
              class="m-0 text-xs font-semibold text-slate-900"
            >
              Overlay Integration
            </h2>
            <p class="text-[10px] text-slate-500">
              Dialog is mounted outside the drawer scroll container.
            </p>
          </div>
          <button
            class="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            type="button"
            aria-label="Close dialog"
            onclick={onClose}
          >
            ×
          </button>
        </header>

        <p class="text-[10px] text-slate-500">
          This verifies portal behavior without letting an overlay be clipped by the node editor
          drawer.
        </p>

        <footer class="flex items-center justify-between gap-2">
          <span></span>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-500 active:scale-[0.98]"
            type="button"
            onclick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  </div>
{/if}
