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
        <span>
          {props.label}
          {props.required && (
            <span class="ml-1 text-(--fui-danger)" aria-hidden="true">
              *
            </span>
          )}
        </span>
      </div>
      <div class="w-full min-w-0">
        {props.children}
        {props.error && (
          <div class="mt-1 text-xs text-(--fui-danger)" role="alert">
            {props.error}
          </div>
        )}
      </div>
    </div>
  )
}
