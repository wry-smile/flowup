import type { LoadingProps } from './types'
import { Icon } from '../../icons'
export function Loading(props: LoadingProps) {
  return (
    <span
      role="status"
      class={`inline-flex items-center gap-2 text-[13px] text-(--fui-text-muted) ${props.class ?? ''}`}
    >
      <Icon name="spinner" class="size-4 animate-spin text-(--fui-text-muted)" />
      {props.label ?? 'Loading...'}
    </span>
  )
}
