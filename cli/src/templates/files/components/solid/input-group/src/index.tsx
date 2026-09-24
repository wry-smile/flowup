import type { InputGroupProps } from './types'
export function InputGroup(props: InputGroupProps) {
  const { prefix, suffix, status, ...inputProps } = props
  return (
    <div class={`flex ${props.class ?? ''}`}>
      {prefix != null && (
        <span class="flex h-(--fui-control-height) shrink-0 items-center rounded-l-[3px] border border-r-0 border-(--fui-border) bg-(--fui-surface-muted) px-2.5 font-mono text-[12px] text-(--fui-text-muted)">
          {prefix}
        </span>
      )}
      <input
        {...inputProps}
        data-fui-status={props.status}
        class={`h-(--fui-control-height) min-w-0 flex-1 border border-(--fui-border) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) ${status === 'error' ? 'border-(--fui-danger) focus:border-(--fui-danger)' : status === 'warning' ? 'border-(--fui-warning) focus:border-(--fui-warning)' : 'border-(--fui-border)'} ${prefix != null ? 'rounded-r-[3px]' : 'rounded-(--fui-radius)'}`}
      />
      {suffix != null && (
        <span class="flex h-(--fui-control-height) items-center rounded-r-[3px] border border-l-0 border-(--fui-border) bg-(--fui-surface-muted) px-2.5 text-[12px] text-(--fui-text-muted)">
          {suffix}
        </span>
      )}
    </div>
  )
}
