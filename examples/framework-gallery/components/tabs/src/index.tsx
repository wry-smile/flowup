import { createSignal, For, Show } from 'solid-js'

import type { TabsProps } from './types'
export function Tabs(props: TabsProps) {
  const [active, setActive] = createSignal(
    props.value ?? props.defaultValue ?? props.items[0]?.id ?? '',
  )
  const current = () => props.value ?? active()
  return (
    <div class={`max-w-[620px] ${props.class ?? ''}`}>
      <div
        role="tablist"
        class="flex items-end gap-1 border-b-2 border-(--fui-border-soft) bg-(--fui-surface-soft) pt-1 pr-1"
      >
        <For each={props.items}>
          {item => (
            <button
              type="button"
              role="tab"
              aria-selected={current() === item.id}
              onClick={() => {
                setActive(item.id)
                props.onChange?.(item.id)
              }}
              class={`relative -mb-[2px] h-[36px] rounded-t-[3px] border border-b-0 px-4 text-[13px] transition-colors ${current() === item.id ? 'z-1 border-b-2 border-(--fui-border) border-b-white bg-(--fui-surface) font-semibold text-(--fui-accent)' : 'border-transparent text-(--fui-text-muted) hover:border-(--fui-border-soft) hover:bg-(--fui-surface-soft) hover:text-(--fui-text)'}`}
            >
              {item.label}
            </button>
          )}
        </For>
      </div>
      <For each={props.items}>
        {item => (
          <Show when={current() === item.id}>
            <div
              role="tabpanel"
              class="min-h-[58px] border-x border-b border-(--fui-border-soft) bg-(--fui-surface) px-4 py-3 text-[13px] text-(--fui-text-muted)"
            >
              {item.content}
            </div>
          </Show>
        )}
      </For>
    </div>
  )
}
