import type { TextareaProps } from './types'
export function Textarea(props: TextareaProps) {
  const { status, ...textareaProps } = props
  return (
    <div class={props.class ?? ''}>
      <textarea
        {...textareaProps}
        data-fui-status={props.status}
        class={`w-full resize-y rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 py-2 text-[13px] leading-5 outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus) disabled:bg-(--fui-surface-soft) ${status === 'error' ? 'border-(--fui-danger) focus:border-(--fui-danger) focus:ring-(--fui-danger)/20' : status === 'warning' ? 'border-(--fui-warning) focus:border-(--fui-warning) focus:ring-(--fui-warning)/30' : 'border-(--fui-border)'}`}
      />
      {props.description && (
        <div class="mt-1 text-[12px] text-(--fui-text-subtle)">{props.description}</div>
      )}
    </div>
  )
}
