import { createEffect, createSignal } from 'solid-js'

import type { TextInputProps } from './types'
import { Icon } from '../../icons'

export function TextInput(props: TextInputProps) {
  const [hasValue, setHasValue] = createSignal(!!props.value)
  let input!: HTMLInputElement

  createEffect(() => setHasValue(!!props.value))

  function clear() {
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div class={`group relative w-full ${props.class ?? ''}`}>
      <input
        ref={element => (input = element)}
        id={props.id}
        data-fui-status={props.status}
        type="text"
        value={props.value ?? ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onInput={event => {
          setHasValue(!!event.currentTarget.value)
          props.onInput?.(event)
        }}
        class={`h-(--fui-control-height) w-full rounded-(--fui-radius) border bg-(--fui-surface) px-2.5 pr-8 text-[14px] transition outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-text-subtle)/30 disabled:cursor-not-allowed disabled:border-(--fui-border-soft) disabled:bg-(--fui-surface-muted) disabled:text-(--fui-text-disabled)`}
      />
      {props.clearable && hasValue() && !props.disabled && (
        <button
          type="button"
          aria-label={props.clearLabel ?? 'Clear value'}
          onClick={clear}
          class="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-(--fui-text-muted) opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-(--fui-text) focus-visible:opacity-100"
        >
          <Icon name="close" class="size-3.5" />
        </button>
      )}
      {props.description && (
        <p class="mt-1 mb-0 text-[12px] text-(--fui-text-subtle)">{props.description}</p>
      )}
    </div>
  )
}
