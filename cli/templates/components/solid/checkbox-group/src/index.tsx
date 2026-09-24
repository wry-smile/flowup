import { For, Show, createSignal } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { CheckboxGroupProps } from './types'

export function CheckboxGroup(props: CheckboxGroupProps) {
  const initial = () =>
    props.value ??
    props.options
      .filter(option => ['payload', 'headers'].includes(String(option.value ?? option.label)))
      .map(option => option.value ?? option.label)
  const [localValue, setLocalValue] = createSignal<OptionValue[]>(initial())
  const selected = () => props.value ?? localValue()

  function toggle(value: OptionValue) {
    const next = selected().includes(value)
      ? selected().filter(item => item !== value)
      : [...selected(), value]
    if (props.value === undefined) setLocalValue(next)
    props.onChange?.(next)
  }

  return (
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
      <For each={props.options}>
        {option => {
          const value = () => option.value ?? option.label
          const checked = () => selected().includes(value())
          return (
            <label
              class={`flex items-center text-[13px] ${option.disabled ? 'cursor-not-allowed text-(--fui-text-disabled)' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={checked()}
                disabled={option.disabled}
                onChange={() => toggle(value())}
                class="peer sr-only"
              />
              <span
                data-fui-control="checkbox"
                data-fui-status={option.disabled ? undefined : props.status}
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
              {option.label}
            </label>
          )
        }}
      </For>
    </div>
  )
}
