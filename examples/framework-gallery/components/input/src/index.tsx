import type { TextInputProps } from './types'

export function TextInput(props: TextInputProps) {
  return (
    <div class={`w-full ${props.class ?? ''}`}>
      <input
        id={props.id}
        data-fui-status={props.status}
        type="text"
        value={props.value ?? ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onInput={props.onInput}
        class={`h-(--fui-control-height) w-full rounded-(--fui-radius) border bg-(--fui-surface) px-2.5 text-[14px] transition outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-text-subtle)/30 disabled:cursor-not-allowed disabled:border-(--fui-border-soft) disabled:bg-(--fui-surface-muted) disabled:text-(--fui-text-disabled)`}
      />
      {props.description && (
        <p class="mt-1 mb-0 text-[12px] text-(--fui-text-subtle)">{props.description}</p>
      )}
    </div>
  )
}
