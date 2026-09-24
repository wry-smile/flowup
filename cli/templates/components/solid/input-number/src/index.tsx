import type { InputNumberProps } from './types'

export function InputNumber(props: InputNumberProps) {
  let input!: HTMLInputElement
  const stepValue = () => props.step ?? (props.precision === undefined ? 1 : 10 ** -props.precision)
  const normalize = (value: number) =>
    props.precision === undefined || !Number.isFinite(value)
      ? value
      : Number(value.toFixed(props.precision))

  function step(direction: 1 | -1) {
    if (direction > 0) input.stepUp()
    else input.stepDown()
    const value = normalize(input.valueAsNumber)
    input.value = String(value)
    props.onChange?.(value)
  }

  return (
    <div class="max-w-[220px]">
      <div
        data-fui-status={props.status}
        class={`flex h-(--fui-control-height) overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) transition focus-within:border-(--fui-interactive) focus-within:ring-1 focus-within:ring-(--fui-focus) hover:border-(--fui-text-subtle) has-[:disabled]:border-(--fui-border-soft) has-[:disabled]:bg-(--fui-surface-muted)`}
      >
        <input
          ref={element => (input = element)}
          id={props.id}
          type="number"
          value={props.value === undefined ? 0 : normalize(props.value)}
          min={props.min}
          max={props.max}
          step={stepValue()}
          disabled={props.disabled}
          onInput={event => props.onChange?.(normalize(event.currentTarget.valueAsNumber))}
          class="h-full min-w-0 flex-1 [appearance:textfield] rounded-none border-0 bg-transparent px-2.5 text-[14px] shadow-none outline-none disabled:text-(--fui-text-disabled) [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{
            border: '0',
            'border-radius': '0',
            'box-shadow': 'none',
            outline: 'none',
            background: 'transparent',
          }}
        />
        <div class="flex w-[26px] shrink-0 flex-col border-l border-(--fui-border-soft)">
          <button
            type="button"
            aria-label={props.increaseLabel ?? 'Increase value'}
            disabled={props.disabled}
            onClick={() => step(1)}
            class="flex min-h-0 flex-1 items-center justify-center border-b border-(--fui-border-soft) text-(--fui-text-muted) hover:bg-(--fui-surface-muted) active:bg-(--fui-border-soft) disabled:cursor-not-allowed disabled:text-(--fui-border)"
          >
            <svg class="size-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6l5 6H5l5-6z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={props.decreaseLabel ?? 'Decrease value'}
            disabled={props.disabled}
            onClick={() => step(-1)}
            class="flex min-h-0 flex-1 items-center justify-center text-(--fui-text-muted) hover:bg-(--fui-surface-muted) active:bg-(--fui-border-soft) disabled:cursor-not-allowed disabled:text-(--fui-border)"
          >
            <svg class="size-2.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 14l-5-6h10l-5 6z" />
            </svg>
          </button>
        </div>
      </div>
      {props.unit && <div class="mt-1 text-[12px] text-(--fui-text-subtle)">{props.unit}</div>}
    </div>
  )
}
