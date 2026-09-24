import type { FormRowComponentProps } from './types'

export function FormRow(props: FormRowComponentProps) {
  const vertical = () => props.layout === 'vertical'

  return (
    <div
      class={
        vertical()
          ? 'flex min-w-0 flex-col gap-1'
          : 'grid grid-cols-[140px_minmax(0,1fr)] items-start gap-3 max-sm:grid-cols-[100px_minmax(0,1fr)]'
      }
    >
      <div
        class={`${vertical() ? 'min-h-0' : 'flex min-h-(--fui-control-height) items-center'} text-[13px] font-medium text-(--fui-text-muted) ${props.labelClass ?? ''}`}
      >
        {props.label}
      </div>
      <div class="min-w-0">{props.children}</div>
    </div>
  )
}
