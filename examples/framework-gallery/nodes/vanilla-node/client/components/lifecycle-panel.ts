export function mountLifecyclePanel(root: HTMLElement): () => void {
  root.innerHTML = `<section class="overflow-hidden rounded-xl border border-slate-200 bg-white"><header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5"><div><h2 class="m-0 text-xs font-semibold">03 · Runtime &amp; Lifecycle</h2><p class="mt-0.5 text-[10px] text-slate-500">Mount cleanup and async state</p></div><span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">effects</span></header><div class="grid grid-cols-2 divide-x divide-slate-200"><div class="p-3.5"><div class="flex items-center justify-between gap-2"><div><p class="text-[11px] font-medium text-slate-900">Lifecycle</p><p class="text-[10px] text-slate-500">Timer cleanup</p></div><button class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" data-toggle type="button">Unmount</button></div><div data-mounted class="mt-3 rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><div class="flex items-center justify-between gap-2"><strong>● Mounted</strong><strong data-seconds>0s</strong></div><p class="text-[10px] text-slate-500" data-stats>mounts 1 · unmounts 0</p></div></div><div class="p-3.5"><p class="text-[11px] font-medium text-slate-900">Async</p><p class="text-[10px] text-slate-500">Loading/success/error</p><div class="flex items-center justify-between gap-2 mt-3"><button class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-3 text-xs font-medium text-white transition hover:bg-indigo-500 active:scale-[0.98]" data-success type="button">Success</button><button class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]" data-error type="button">Error</button></div><div class="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600 data-[state=loading]:bg-amber-50 data-[state=loading]:text-amber-700 data-[state=success]:bg-emerald-50 data-[state=success]:text-emerald-700 data-[state=error]:bg-rose-50 data-[state=error]:text-rose-700" data-status="idle"><span>Status</span><strong>idle</strong></div></div></div></section>`
  let mounted = true
  let seconds = 0
  let mounts = 1
  let unmounts = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let pending: ReturnType<typeof setTimeout> | undefined
  const mountedBox = root.querySelector<HTMLElement>('[data-mounted]')!
  const secondsText = root.querySelector<HTMLElement>('[data-seconds]')!
  const statsText = root.querySelector<HTMLElement>('[data-stats]')!
  const toggleButton = root.querySelector<HTMLButtonElement>('[data-toggle]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const start = () => {
    clearInterval(timer)
    timer = setInterval(() => {
      seconds++
      secondsText.textContent = `${seconds}s`
    }, 1000)
  }
  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }
  const toggle = () => {
    mounted = !mounted
    toggleButton.textContent = mounted ? 'Unmount' : 'Mount'
    mountedBox.hidden = !mounted
    if (mounted) {
      mounts++
      seconds = 0
      start()
    } else {
      unmounts++
      stop()
    }
    statsText.textContent = `mounts ${mounts} · unmounts ${unmounts}`
  }
  const simulate = (kind: 'success' | 'error') => {
    clearTimeout(pending)
    status.dataset.state = 'loading'
    status.lastElementChild!.textContent = 'loading'
    pending = setTimeout(() => {
      status.dataset.state = kind
      status.lastElementChild!.textContent = kind
    }, 650)
  }
  const success = () => simulate('success')
  const error = () => simulate('error')
  toggleButton.addEventListener('click', toggle)
  root.querySelector('[data-success]')!.addEventListener('click', success)
  root.querySelector('[data-error]')!.addEventListener('click', error)
  start()
  return () => {
    stop()
    clearTimeout(pending)
    toggleButton.removeEventListener('click', toggle)
    root.querySelector('[data-success]')?.removeEventListener('click', success)
    root.querySelector('[data-error]')?.removeEventListener('click', error)
  }
}
