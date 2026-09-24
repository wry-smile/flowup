import { Show, createSignal } from 'solid-js'

import type { CheckboxProps } from './types'

export function Checkbox(props: CheckboxProps) {
  const [localChecked, setLocalChecked] = createSignal(props.checked ?? false)
  const checked = () => props.checked ?? localChecked()

  return (
    <label
      class={`flex min-h-[28px] w-fit items-center text-[13px] ${props.disabled ? 'cursor-not-allowed text-(--fui-text-disabled)' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={checked()}
        disabled={props.disabled}
        onChange={event => {
          const value = event.currentTarget.checked
          if (props.checked === undefined) setLocalChecked(value)
          props.onChange?.(value)
        }}
        class="peer sr-only"
      />
      <span
        data-fui-control="checkbox"
        data-fui-status={props.disabled ? undefined : props.status}
        class="mr-2 flex size-[16px] shrink-0 items-center justify-center rounded-[2px] border border-(--fui-text-disabled) bg-(--fui-surface) peer-checked:border-(--fui-interactive) peer-checked:bg-(--fui-interactive)"
      >
        <Show when={checked()}>
          <svg
            class="size-[11px] text-white"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <path d="m4 10 4 4 8-8" />
          </svg>
        </Show>
      </span>
      {props.label}
    </label>
  )
}
