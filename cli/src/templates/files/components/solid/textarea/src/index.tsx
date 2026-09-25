import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import type { TextareaProps } from './types'
import { Icon } from '../../icons'

export function Textarea(props: TextareaProps) {
  const { status, clearable, clearLabel, description, class: className, ...textareaProps } = props
  const [hasValue, setHasValue] = createSignal(!!props.value)
  let textarea!: HTMLTextAreaElement

  createEffect(() => setHasValue(!!props.value))

  onMount(() => {
    const updateValueState = () => setHasValue(!!textarea.value)
    textarea.addEventListener('input', updateValueState)
    onCleanup(() => textarea.removeEventListener('input', updateValueState))
  })

  function clear() {
    textarea.value = ''
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div class={`group relative ${className ?? ''}`}>
      <textarea
        ref={element => (textarea = element)}
        {...textareaProps}
        data-fui-status={props.status}
        class={`w-full resize-y rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 py-2 pr-8 text-[13px] leading-5 outline-none placeholder:text-(--fui-text-subtle) placeholder:opacity-100 hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus) disabled:bg-(--fui-surface-soft) ${status === 'error' ? 'border-(--fui-danger) focus:border-(--fui-danger) focus:ring-(--fui-danger)/20' : status === 'warning' ? 'border-(--fui-warning) focus:border-(--fui-warning) focus:ring-(--fui-warning)/30' : 'border-(--fui-border)'}`}
      />
      {clearable && hasValue() && !textareaProps.disabled && (
        <button
          type="button"
          aria-label={clearLabel ?? 'Clear value'}
          onClick={clear}
          class="absolute top-2 right-2 flex size-5 items-center justify-center rounded text-(--fui-text-muted) opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-(--fui-text) focus-visible:opacity-100"
        >
          <Icon name="close" class="size-3.5" />
        </button>
      )}
      {description && <div class="mt-1 text-[12px] text-(--fui-text-subtle)">{description}</div>}
    </div>
  )
}
