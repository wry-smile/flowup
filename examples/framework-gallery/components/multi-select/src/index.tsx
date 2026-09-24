import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { MultiSelectProps } from './types'
const popupClass =
  'absolute left-0 right-0 top-[38px] z-40 overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'

function closeOnOutside(ref: () => HTMLElement | undefined, close: () => void) {
  onMount(() => {
    const controller = new AbortController()
    document.addEventListener('pointerdown', (event: PointerEvent) => {
      if (!ref()?.contains(event.target as Node)) close()
    }, { signal: controller.signal })
    onCleanup(() => controller.abort())
  })
}

export function MultiSelect(props: MultiSelectProps) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [localValue, setLocalValue] = createSignal<OptionValue[]>(props.value ?? [])
  let searchInput!: HTMLInputElement
  let container!: HTMLDivElement
  const selected = () => props.value ?? localValue()
  const filtered = () =>
    props.options.filter(option =>
      option.label.toLowerCase().includes(query().trim().toLowerCase()),
    )
  closeOnOutside(
    () => container,
    () => setOpen(false),
  )

  function update(next: OptionValue[]) {
    setLocalValue(next)
    props.onChange?.(next)
  }

  function toggleValue(value: OptionValue) {
    update(
      selected().includes(value)
        ? selected().filter(item => item !== value)
        : [...selected(), value],
    )
  }

  function togglePopup() {
    const willOpen = !open()
    setOpen(willOpen)
    if (willOpen) queueMicrotask(() => searchInput?.focus())
  }

  return (
    <div ref={element => (container = element)} id={props.id} class="relative max-w-[520px]">
      <div
        role="combobox"
        data-fui-status={props.status}
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-controls={props.id ? `${props.id}-popup` : undefined}
        onClick={togglePopup}
        onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && togglePopup()}
        class={`flex min-h-(--fui-control-height) w-full cursor-default items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-1.5 py-[3px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)`}
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Show when={selected().length === 0}>
            <span class="px-1 text-[14px] text-(--fui-text-subtle)">
              {props.placeholder ?? 'Select...'}
            </span>
          </Show>
          <For each={selected()}>
            {value => {
              const option = () => props.options.find(item => item.value === value)
              return (
                <span class="flex h-[24px] items-center rounded-[2px] border border-(--fui-border-soft) bg-(--fui-surface-muted) pr-1 pl-2 text-[12px]">
                  <span>{String(option()?.label ?? value)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${String(option()?.label ?? value)}`}
                    onClick={event => {
                      event.stopPropagation()
                      toggleValue(value)
                    }}
                    class="ml-1 flex size-[18px] items-center justify-center rounded-[2px] text-(--fui-interactive) hover:bg-(--fui-surface-selected) hover:text-(--fui-text)"
                  >
                    ×
                  </button>
                </span>
              )
            }}
          </For>
        </div>
        <svg
          class="ml-1 size-4 shrink-0 text-(--fui-interactive)"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5 7l5 6 5-6H5z" />
        </svg>
      </div>
      <Show when={open()}>
        <div id={props.id ? `${props.id}-popup` : undefined} class={popupClass}>
          <div class="border-b border-(--fui-border-soft) p-1.5">
            <div class="flex h-[30px] items-center rounded-[2px] border border-(--fui-border) px-2 focus-within:border-(--fui-interactive)">
              <svg
                class="mr-1.5 size-3.5 text-(--fui-text-subtle)"
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
                class="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
            </div>
          </div>
          <div class="flex h-[31px] items-center justify-between border-b border-(--fui-border-subtle) bg-(--fui-surface-soft) px-2.5 text-[12px]">
            <span class="text-(--fui-interactive)">
              {props.selectedCountText?.(selected().length) ?? `${selected().length} selected`}
            </span>
            <button
              type="button"
              onClick={() => update([])}
              class="text-(--fui-text-muted) hover:text-(--fui-accent)"
            >
              {props.clearLabel ?? 'Clear'}
            </button>
          </div>
          <div
            role="listbox"
            aria-multiselectable="true"
            class="fui-scrollbar max-h-[220px] overflow-y-auto py-1"
          >
            <For each={filtered()}>
              {option => {
                const checked = () => selected().includes(option.value)
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked()}
                    disabled={option.disabled}
                    onClick={() => toggleValue(option.value)}
                    class={`flex h-(--fui-button-height) w-full items-center px-2.5 text-left hover:bg-(--fui-surface-muted) ${checked() ? 'bg-(--fui-surface-muted)' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span
                      class={`mr-2 flex size-[15px] shrink-0 items-center justify-center rounded-[2px] border ${checked() ? 'border-(--fui-interactive) bg-(--fui-interactive)' : 'border-(--fui-text-disabled) bg-(--fui-surface)'}`}
                    >
                      <svg
                        class={`size-[11px] text-white ${checked() ? '' : 'hidden'}`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                      >
                        <path d="m4 10 4 4 8-8" />
                      </svg>
                    </span>
                    <span class="text-[13px]">
                      {props.renderOption ? props.renderOption(option, checked()) : option.label}
                    </span>
                  </button>
                )
              }}
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
