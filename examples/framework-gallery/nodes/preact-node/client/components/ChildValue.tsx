interface Props {
  value: number
  onIncrement: () => void
}

export default function ChildValue({ value, onIncrement }: Props) {
  return (
    <div class="flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-violet-700">
      <span>Value</span>
      <strong>{value}</strong>
      <button
        class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
        type="button"
        onClick={onIncrement}
      >
        Emit +1
      </button>
    </div>
  )
}
