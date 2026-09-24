import { createSignal, Show } from 'solid-js'

import type { CollapseProps } from './types'
export function Collapse(props: CollapseProps) {
  const [expanded, setExpanded] = createSignal(props.open ?? props.defaultOpen ?? false)
  const isOpen = () => props.open ?? expanded()
  const toggle = () => {
    const next = !isOpen()
    setExpanded(next)
    props.onToggle?.(next)
  }
  return (
    <section
      class={`overflow-hidden rounded-(--fui-radius) border border-(--fui-border-soft) ${props.class ?? ''}`}
    >
      <button
        type="button"
        aria-expanded={isOpen()}
        onClick={toggle}
        class="flex h-[36px] w-full items-center bg-(--fui-surface-soft) px-2.5 text-left text-[13px] font-medium hover:bg-(--fui-surface-hover)"
      >
        <svg
          class={`mr-1 size-4 transition-transform ${isOpen() ? 'rotate-90' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
        {props.title}
        <span class="ml-auto text-[11px] font-normal text-(--fui-text-subtle)">{props.extra}</span>
      </button>
      <Show when={isOpen()}>
        <div class="border-t border-(--fui-border-soft) p-4 text-[13px] text-(--fui-text-muted)">
          {props.children}
        </div>
      </Show>
    </section>
  )
}
