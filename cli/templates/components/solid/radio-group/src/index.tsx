import { For, createSignal } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { RadioGroupProps } from './types'

export function RadioGroup(props: RadioGroupProps) {
  const [localValue, setLocalValue] = createSignal<OptionValue>(
    props.value ?? props.options[0]?.value ?? props.options[0]?.label ?? '',
  )
  const selected = () => props.value ?? localValue()

  return (
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <For each={props.options}>
        {option => {
          const value = () => option.value ?? option.label
          const checked = () => selected() === value()
          return (
            <label
              class={`flex items-center text-[13px] ${option.disabled ? 'cursor-not-allowed text-(--fui-text-disabled)' : 'cursor-pointer'}`}
            >
              <input
                name={props.name}
                type="radio"
                value={String(value())}
                checked={checked()}
                disabled={option.disabled}
                onChange={() => {
                  if (props.value === undefined) setLocalValue(value())
                  props.onChange?.(value())
                }}
                class="peer sr-only"
              />
              <span
                data-fui-control="radio"
                data-fui-status={option.disabled ? undefined : props.status}
                class="mr-2 flex size-[16px] shrink-0 items-center justify-center rounded-full border border-(--fui-text-disabled) bg-(--fui-surface) peer-checked:border-(--fui-interactive) peer-focus-visible:ring-1 peer-focus-visible:ring-(--fui-focus)"
              >
                <span
                  class={`size-[8px] rounded-full bg-(--fui-text-muted) ${checked() && !option.disabled ? '' : 'hidden'}`}
                />
              </span>
              {option.label}
            </label>
          )
        }}
      </For>
    </div>
  )
}
