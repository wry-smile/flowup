import { createSignal } from 'solid-js'

import type { SwitchProps } from './types'

export function Switch(props: SwitchProps) {
  const [localChecked, setLocalChecked] = createSignal(props.checked ?? false)
  const checked = () => props.checked ?? localChecked()

  return (
    <label
      class={`flex w-fit items-center ${props.disabled ? 'cursor-not-allowed text-(--fui-text-disabled)' : 'cursor-pointer'}`}
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
        data-fui-control="switch"
        data-fui-status={props.disabled ? undefined : props.status}
        class={`relative h-[20px] w-[36px] shrink-0 rounded-[10px] border bg-(--fui-border-soft) transition peer-focus-visible:ring-1 peer-focus-visible:ring-(--fui-text-subtle)/40 after:absolute after:top-[2px] after:left-[2px] after:size-[14px] after:rounded-full after:border-(--fui-text-disabled) after:bg-(--fui-surface) after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-[16px] ${props.disabled ? 'border-(--fui-border-soft) bg-(--fui-border-subtle) after:border-(--fui-border-soft) after:bg-(--fui-surface-soft)' : 'border-(--fui-text-disabled) peer-checked:border-(--fui-interactive) peer-checked:bg-(--fui-interactive)'}`}
      />
      <span class="ml-2 text-[13px]">{props.label}</span>
    </label>
  )
}
