import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { OptionValue, SelectProps } from './types'
const triggerClass =
  'flex h-(--fui-control-height) w-full items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)'

const popupClass =
  'absolute left-0 right-0 top-[38px] z-40 overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'

const optionClass =
  'flex h-[31px] w-full items-center px-2.5 text-left text-[13px] hover:bg-(--fui-surface-muted)'

function closeOnOutside(ref: () => HTMLElement | undefined, close: () => void) {
  onMount(() => {
    const controller = new AbortController()
    document.addEventListener('pointerdown', (event: PointerEvent) => {
      if (!ref()?.contains(event.target as Node)) close()
    }, { signal: controller.signal })
    onCleanup(() => controller.abort())
  })
}

export function Select(props: SelectProps) {
  const [open, setOpen] = createSignal(false)
  const [localValue, setLocalValue] = createSignal(props.value ?? props.options[0]?.value ?? '')
  let container!: HTMLDivElement
  const selected = () => props.value ?? localValue()
  const selectedLabel = () =>
    props.options.find(option => option.value === selected())?.label ?? props.placeholder ?? ''
  closeOnOutside(
    () => container,
    () => setOpen(false),
  )

  function choose(value: OptionValue) {
    setLocalValue(value)
    props.onChange?.(value)
    setOpen(false)
  }

  return (
    <div ref={element => (container = element)} id={props.id} class="relative max-w-[420px]">
      <button
        type="button"
        aria-haspopup="listbox"
        data-fui-status={props.status}
        aria-expanded={open()}
        onClick={() => setOpen(value => !value)}
        class={`${triggerClass}`}
      >
        <span class="min-w-0 flex-1 truncate text-left">{selectedLabel()}</span>
        <svg
          class="size-4 shrink-0 text-(--fui-interactive)"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5 7l5 6 5-6H5z" />
        </svg>
      </button>
      <Show when={open()}>
        <div role="listbox" class={`${popupClass} py-1`}>
          <For each={props.options}>
            {option => (
              <button
                type="button"
                role="option"
                aria-selected={selected() === option.value}
                onClick={() => choose(option.value)}
                disabled={option.disabled}
                class={`${optionClass} ${selected() === option.value ? 'bg-(--fui-surface-selected)' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {props.renderOption
                  ? props.renderOption(option, selected() === option.value)
                  : option.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
