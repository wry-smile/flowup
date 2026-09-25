import type { AlertProps } from './types'

export function Alert(props: AlertProps) {
  return (
    <div
      role="status"
      data-fui-tone={props.status ?? 'info'}
      class={`rounded-(--fui-radius) border px-3 py-2 text-[12px] ${props.class ?? ''}`}
    >
      {props.children}
    </div>
  )
}
