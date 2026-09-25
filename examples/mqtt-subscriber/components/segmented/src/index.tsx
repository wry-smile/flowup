import { For, createSignal } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { SegmentedProps, SegmentedOption } from './types'

const optionValue = (option: string | SegmentedOption): OptionValue =>
  typeof option === 'string' ? option : option.value
const optionLabel = (option: string | SegmentedOption) =>
  typeof option === 'string' ? option : option.label

export function Segmented(props: SegmentedProps) {
  const [localValue, setLocalValue] = createSignal<OptionValue>(
    props.value ?? (props.options[0] ? optionValue(props.options[0]) : ''),
  )
  const selected = () => props.value ?? localValue()

  return (
    <div
      role="group"
      data-fui-status={props.status}
      class={`inline-flex w-fit overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface-soft)`}
    >
      <For each={props.options}>
        {(option, index) => {
          const value = () => optionValue(option)
          const disabled = () => (typeof option === 'string' ? false : !!option.disabled)
          const active = () => selected() === value()
          return (
            <button
              type="button"
              aria-pressed={active()}
              disabled={disabled()}
              onClick={() => {
                setLocalValue(value())
                props.onChange?.(value())
              }}
              class={`h-[31px] px-4 text-[13px] ${index() < props.options.length - 1 ? 'border-r border-(--fui-border-soft)' : ''} ${active() ? 'bg-(--fui-surface) shadow-[inset_0_-2px_0_var(--fui-accent)]' : 'hover:bg-(--fui-surface)'}`}
            >
              {optionLabel(option)}
            </button>
          )
        }}
      </For>
    </div>
  )
}
