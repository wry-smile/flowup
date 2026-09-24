import type { LoadingProps } from './types'
export function Loading(props: LoadingProps) {
  return (
    <span
      role="status"
      class={`inline-flex items-center gap-2 text-[13px] text-(--fui-text-muted) ${props.class ?? ''}`}
    >
      <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="var(--fui-border-soft)" stroke-width="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="var(--fui-text-muted)"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
      {props.label ?? 'Loading...'}
    </span>
  )
}
