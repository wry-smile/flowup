import { createSignal } from 'solid-js'
import { resourceUrl } from '../showcase'
import { DialogRoot } from './DialogRoot'

export default function IntegrationPanel() {
  const [dialogOpen, setDialogOpen] = createSignal(false)
  return (
    <>
      <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
          <div>
            <h2 class="m-0 text-xs font-semibold">04 · UI Integration</h2>
            <p class="mt-0.5 text-[10px] text-slate-500">Asset, style and overlay integration</p>
          </div>
          <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
            dom / css
          </span>
        </header>
        <div class="grid grid-cols-3 gap-2 gap-3 p-3.5 max-[480px]:grid-cols-1">
          <div class="rounded-lg bg-slate-50 p-2.5">
            <span class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700">
              Aa
            </span>
            <p class="text-[11px] font-medium text-slate-900">Local style</p>
            <p class="text-[10px] text-slate-500">Scoped panel styles</p>
          </div>
          <div class="rounded-lg bg-slate-50 p-2.5">
            <img
              class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700"
              src={resourceUrl('badge.svg')}
              alt="Node resource"
            />
            <p class="text-[11px] font-medium text-slate-900">SVG asset</p>
            <p class="text-[10px] text-slate-500">Loaded from resources</p>
          </div>
          <button
            class="w-full rounded-lg border-0 bg-slate-50 p-2.5 text-left transition hover:bg-amber-50"
            type="button"
            onClick={() => setDialogOpen(true)}
          >
            <span class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700">
              ▣
            </span>
            <p class="text-[11px] font-medium text-slate-900">Overlay</p>
            <p class="text-[10px] text-slate-500">Portal outside the drawer</p>
          </button>
        </div>
      </section>
      <DialogRoot open={dialogOpen()} onClose={() => setDialogOpen(false)} />
    </>
  )
}
