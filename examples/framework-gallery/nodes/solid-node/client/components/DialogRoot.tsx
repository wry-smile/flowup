import { onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

export function DialogRoot(props: { open: boolean; onClose: () => void }) {
  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.open) props.onClose()
    }
    document.addEventListener('keydown', onKey)
    onCleanup(() => document.removeEventListener('keydown', onKey))
  })
  return (
    <Show when={props.open}>
      <Portal>
        <div data-flowup-scope="framework-gallery">
          <div
            class="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
            role="presentation"
            onClick={event => {
              if (event.target === event.currentTarget) props.onClose()
            }}
          >
            <section
              class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="flowup-overlay-title"
            >
              <header>
                <div>
                  <h2
                    id="flowup-overlay-title"
                    class="m-0 text-xs text-[11px] font-medium font-semibold text-slate-900"
                  >
                    Overlay Integration
                  </h2>
                  <p class="text-[10px] text-slate-500">
                    Dialog is mounted outside the drawer scroll container.
                  </p>
                </div>
                <button
                  class="inline-flex size-8 h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-0 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                  type="button"
                  aria-label="Close dialog"
                  onClick={props.onClose}
                >
                  ×
                </button>
              </header>
              <p class="text-[10px] text-slate-500">
                This verifies portal behavior without letting an overlay be clipped by the node
                editor drawer.
              </p>
              <footer class="flex items-center justify-between gap-2">
                <span></span>
                <button
                  class="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 border-slate-200 bg-indigo-600 bg-white px-3 text-xs font-medium text-slate-700 text-white transition hover:bg-indigo-500 hover:bg-slate-50 active:scale-[0.98]"
                  type="button"
                  onClick={props.onClose}
                >
                  Close
                </button>
              </footer>
            </section>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
