import type { ButtonProps } from './types'
const variants = {
  default:
    'border-(--fui-border) bg-(--fui-surface) text-(--fui-text) hover:bg-(--fui-surface-hover) active:bg-(--fui-border-subtle)',
  primary: 'border-(--fui-accent-hover) bg-(--fui-accent) text-white hover:bg-(--fui-accent-hover)',
  danger:
    'border-(--fui-danger) bg-(--fui-surface) text-(--fui-danger) hover:bg-(--fui-danger-soft)',
}
export function Button(props: ButtonProps) {
  const variant = () => props.variant ?? 'default'
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      class={`inline-flex h-(--fui-button-height) items-center justify-center rounded-(--fui-radius) border px-3 text-[13px] disabled:cursor-not-allowed disabled:border-(--fui-border-soft) disabled:bg-(--fui-surface-muted) disabled:text-(--fui-text-disabled) ${variants[variant()]} ${props.class ?? ''}`}
    />
  )
}
