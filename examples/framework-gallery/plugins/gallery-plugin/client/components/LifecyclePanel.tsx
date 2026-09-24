import { useEffect, useRef, useState } from 'preact/hooks'

type AsyncState = 'idle' | 'loading' | 'success' | 'error'

export default function LifecyclePanel() {
  const [mounted, setMounted] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [mounts, setMounts] = useState(1)
  const [unmounts, setUnmounts] = useState(0)
  const [asyncState, setAsyncState] = useState<AsyncState>('idle')
  const pending = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!mounted) return
    const timer = setInterval(() => setSeconds(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [mounted])
  useEffect(() => () => clearTimeout(pending.current), [])
  function toggleLifecycle() {
    setMounted(value => !value)
    if (mounted) setUnmounts(value => value + 1)
    else {
      setMounts(value => value + 1)
      setSeconds(0)
    }
  }
  function simulate(kind: 'success' | 'error') {
    clearTimeout(pending.current)
    setAsyncState('loading')
    pending.current = setTimeout(() => setAsyncState(kind), 650)
  }
  return (
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 px-3.5 py-2.5">
        <div>
          <h2 class="m-0 text-xs font-semibold">03 · Runtime &amp; Lifecycle</h2>
          <p class="mt-0.5 text-[10px] text-slate-500">Mount cleanup and async state</p>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
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
              onClick={toggleLifecycle}
            >
              {mounted ? 'Unmount' : 'Mount'}
            </button>
          </div>
          {mounted ? (
            <div class="mt-3 rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
              <div class="flex items-center justify-between gap-2">
                <strong>● Mounted</strong>
                <strong>{seconds}s</strong>
              </div>
              <p class="text-[10px] text-slate-500">
                mounts {mounts} · unmounts {unmounts}
              </p>
            </div>
          ) : (
            <div class="mt-3 rounded-lg border border-dashed border-slate-300 py-3 text-center text-[10px] text-slate-500">
              Unmounted
            </div>
          )}
        </div>
        <div class="p-3.5">
          <p class="text-[11px] font-medium text-slate-900">Async</p>
          <p class="text-[10px] text-slate-500">Loading/success/error</p>
          <div class="mt-3 flex items-center justify-between gap-2">
            <button
              class="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-600 border-slate-200 bg-indigo-600 bg-white px-3 text-xs font-medium text-slate-700 text-white transition hover:bg-indigo-500 hover:bg-slate-50 active:scale-[0.98]"
              type="button"
              onClick={() => simulate('success')}
            >
              Success
            </button>
            <button
              class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
              type="button"
              onClick={() => simulate('error')}
            >
              Error
            </button>
          </div>
          <div
            class="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600 data-[state=error]:bg-rose-50 data-[state=error]:text-rose-700 data-[state=loading]:bg-amber-50 data-[state=loading]:text-amber-700 data-[state=success]:bg-emerald-50 data-[state=success]:text-emerald-700"
            data-state={asyncState}
          >
            <span>Status</span>
            <strong>{asyncState}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}
