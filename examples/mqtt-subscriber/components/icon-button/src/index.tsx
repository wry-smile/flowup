import type { IconButtonProps } from './types'
export function IconButton(props: IconButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      aria-label={props.label}
      title={props.label}
      class={`flex size-(--fui-button-height) items-center justify-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) text-(--fui-text-muted) hover:bg-(--fui-surface-muted) disabled:opacity-50 ${props.class ?? ''}`}
    />
  )
}
