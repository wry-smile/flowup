import { Show } from 'solid-js'

import type { RangeInputProps } from './types'

export function RangeInput(props: RangeInputProps) {
  const value = () => props.value ?? props.min ?? 0

  return (
    <div class="flex w-full min-w-0 items-center gap-3">
      <input
        id={props.id}
        type="range"
        min={props.min ?? 0}
        max={props.max ?? 100}
        step={props.step ?? 1}
        value={value()}
        disabled={props.disabled}
        onInput={event => props.onChange?.(Number(event.currentTarget.value))}
        class="h-2 min-w-0 flex-1 cursor-pointer accent-(--fui-accent) disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Show when={props.showValue !== false}>
        <output class="min-w-[3.5rem] text-right text-[13px] text-(--fui-text-muted) tabular-nums">
          {value()}
          {props.unit ? ` ${props.unit}` : ''}
        </output>
      </Show>
    </div>
  )
}
