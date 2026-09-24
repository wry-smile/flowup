import { resourceUrl } from '../showcase'

export function mountIntegrationPanel(root: HTMLElement): () => void {
  root.innerHTML = `<section class="overflow-hidden rounded-xl border border-slate-200 bg-white"><header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5"><div><h2 class="m-0 text-xs font-semibold">04 · UI Integration</h2><p class="mt-0.5 text-[10px] text-slate-500">Asset, style and overlay integration</p></div><span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">dom / css</span></header><div class="grid gap-3 p-3.5 grid grid-cols-3 gap-2 max-[480px]:grid-cols-1"><div class="rounded-lg bg-slate-50 p-2.5"><span class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700">Aa</span><p class="text-[11px] font-medium text-slate-900">Local style</p><p class="text-[10px] text-slate-500">Scoped panel styles</p></div><div class="rounded-lg bg-slate-50 p-2.5"><img class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700" data-resource alt="Node resource" /><p class="text-[11px] font-medium text-slate-900">SVG asset</p><p class="text-[10px] text-slate-500">Loaded from resources</p></div><button class="rounded-lg bg-slate-50 p-2.5 w-full border-0 text-left transition hover:bg-amber-50" data-open-overlay type="button"><span class="grid size-7 place-items-center rounded-md bg-indigo-100 text-indigo-700">▣</span><p class="text-[11px] font-medium text-slate-900">Overlay</p><p class="text-[10px] text-slate-500">Portal outside the drawer</p></button></div></section>`
  const image = root.querySelector<HTMLImageElement>('[data-resource]')!
  image.src = resourceUrl('badge.svg')
  const overlay = document.createElement('div')
  overlay.className =
    'fixed inset-0 z-[10000] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm'
  overlay.dataset.flowupScope = 'framework-gallery-vanilla-node'
  overlay.hidden = true
  overlay.innerHTML = `<section class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl" role="dialog" aria-modal="true"><header><div><p class="text-[11px] font-medium text-slate-900">Overlay Integration</p><p class="text-[10px] text-slate-500">Dialog is mounted outside the drawer scroll container.</p></div><button class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] size-8 px-0" data-close aria-label="Close">×</button></header><p class="text-[10px] text-slate-500">This overlay is mounted on document.body so the node editor drawer does not clip it.</p><div class="flex items-center justify-between gap-2"><span></span><button class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-500 active:scale-[0.98]" data-confirm type="button">Close</button></div></section>`
  document.body.append(overlay)
  const openButton = root.querySelector<HTMLButtonElement>('[data-open-overlay]')!
  const closeButtons = overlay.querySelectorAll<HTMLButtonElement>('[data-close], [data-confirm]')
  const open = () => {
    overlay.hidden = false
  }
  const close = () => {
    overlay.hidden = true
  }
  const onBackdrop = (event: MouseEvent) => {
    if (event.target === overlay) close()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  }
  openButton.addEventListener('click', open)
  closeButtons.forEach(button => button.addEventListener('click', close))
  overlay.addEventListener('click', onBackdrop)
  document.addEventListener('keydown', onKey)
  return () => {
    openButton.removeEventListener('click', open)
    closeButtons.forEach(button => button.removeEventListener('click', close))
    overlay.removeEventListener('click', onBackdrop)
    document.removeEventListener('keydown', onKey)
    overlay.remove()
  }
}
