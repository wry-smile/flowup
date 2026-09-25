import type { TagProps } from './types'

export function Tag(props: TagProps) {
  const variant = () => props.variant ?? 'default'
  return (
    <span
      data-fui-tone={variant() === 'default' ? undefined : variant()}
      class={`inline-flex rounded-[2px] border px-1.5 py-[2px] text-[11px] ${variant() === 'default' ? 'border-(--fui-border-soft) bg-(--fui-surface-muted) text-(--fui-text-muted)' : ''} ${props.class ?? ''}`}
    >
      {props.children}
    </span>
  )
}
export const Badge = Tag
