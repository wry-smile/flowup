import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { SearchSelectProps } from './types'
const triggerClass =
  'flex h-(--fui-control-height) w-full items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)'

const popupClass =
  'absolute left-0 right-0 top-[38px] z-40 overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'

const optionClass =
  'flex h-[31px] w-full items-center px-2.5 text-left text-[13px] hover:bg-(--fui-surface-muted)'

function closeOnOutside(ref: () => HTMLElement | undefined, close: () => void) {
  onMount(() => {
    const controller = new AbortController()
    document.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if (!ref()?.contains(event.target as Node)) close()
      },
      { signal: controller.signal },
    )
    onCleanup(() => controller.abort())
  })
}

export function SearchSelect(props: SearchSelectProps) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [localValue, setLocalValue] = createSignal<OptionValue>(props.value ?? '')
  let searchInput!: HTMLInputElement
  let container!: HTMLDivElement
  const selected = () => props.value ?? localValue()
  const selectedLabel = () => props.options.find(option => option.value === selected())?.label
  const filtered = () =>
    props.options.filter(option =>
      option.label.toLowerCase().includes(query().trim().toLowerCase()),
    )
  closeOnOutside(
    () => container,
    () => setOpen(false),
  )

  function toggle() {
    const willOpen = !open()
    setOpen(willOpen)
    if (willOpen) queueMicrotask(() => searchInput?.focus())
  }

  function choose(value: OptionValue) {
    setLocalValue(value)
    props.onChange?.(value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={element => (container = element)} id={props.id} class="relative max-w-[420px]">
      <button
        type="button"
        aria-haspopup="listbox"
        data-fui-status={props.status}
        aria-expanded={open()}
        onClick={toggle}
        class={`${triggerClass}`}
      >
        <span
          class={`min-w-0 flex-1 truncate text-left ${selectedLabel() ? '' : 'text-(--fui-text-subtle)'}`}
        >
          {selectedLabel() ?? props.placeholder ?? 'Select...'}
        </span>
        <svg
          class="size-4 shrink-0 text-(--fui-interactive)"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5 7l5 6 5-6H5z" />
        </svg>
      </button>
      <Show when={open()}>
        <div class={popupClass}>
          <div class="border-b border-(--fui-border-soft) p-1.5">
            <div class="flex h-[30px] items-center rounded-[2px] border border-(--fui-border) px-2 focus-within:border-(--fui-interactive)">
              <svg
                class="mr-1.5 size-3.5 shrink-0 text-(--fui-text-subtle)"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" />
              </svg>
              <input
                ref={element => (searchInput = element)}
                value={query()}
                onInput={event => setQuery(event.currentTarget.value)}
                placeholder={props.searchPlaceholder ?? 'Search...'}
                class="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--fui-text-disabled)"
              />
            </div>
          </div>
          <div role="listbox" class="fui-scrollbar max-h-[220px] overflow-y-auto py-1">
            <For each={filtered()}>
              {option => (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected() === option.value}
                  disabled={option.disabled}
                  onClick={() => choose(option.value)}
                  class={`${optionClass} ${selected() === option.value ? 'bg-(--fui-surface-selected)' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {props.renderOption
                    ? props.renderOption(option, selected() === option.value)
                    : option.label}
                </button>
              )}
            </For>
            <Show when={!filtered().length}>
              <div class="px-3 py-5 text-center text-[12px] text-(--fui-text-subtle)">
                {props.emptyLabel ?? 'No matching options'}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
