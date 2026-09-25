import { createSignal } from 'solid-js'

import type { RadioProps } from './types'

export function Radio(props: RadioProps) {
  const [localChecked, setLocalChecked] = createSignal(props.checked ?? false)
  const checked = () => props.checked ?? localChecked()

  return (
    <label
      class={`flex w-fit items-center text-[13px] ${props.disabled ? 'cursor-not-allowed text-(--fui-text-disabled)' : 'cursor-pointer'}`}
    >
      <input
        name={props.name}
        type="radio"
        checked={checked()}
        disabled={props.disabled}
        onChange={() => {
          if (props.checked === undefined) setLocalChecked(true)
          props.onChange?.()
        }}
        class="peer sr-only"
      />
      <span
        data-fui-control="radio"
        data-fui-status={props.disabled ? undefined : props.status}
        class="mr-2 flex size-[16px] shrink-0 items-center justify-center rounded-full border border-(--fui-text-disabled) bg-(--fui-surface) peer-checked:border-(--fui-interactive) peer-focus-visible:ring-1 peer-focus-visible:ring-(--fui-focus)"
      >
        <span
          class={`size-[8px] rounded-full bg-(--fui-text-muted) ${checked() && !props.disabled ? '' : 'hidden'}`}
        />
      </span>
      {props.label}
    </label>
  )
}
