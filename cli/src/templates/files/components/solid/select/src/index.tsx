import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'

import type { OptionValue, SelectProps } from './types'
import { autoPositionPopup, createPopupPortalHost } from './floating'
import { Icon } from '../../icons'
const triggerClass =
  'flex h-(--fui-control-height) w-full min-w-0 max-w-full items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)'

const popupClass =
  'fixed z-50 max-w-full overflow-auto rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'

const optionClass =
  'flex h-[31px] w-full min-w-0 items-center px-2.5 text-left text-[13px] hover:bg-(--fui-surface-muted)'

function closeOnOutside(
  ref: () => HTMLElement | undefined,
  popupRef: () => HTMLElement | undefined,
  close: () => void,
) {
  onMount(() => {
    const controller = new AbortController()
    document.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        const target = event.target as Node
        if (!ref()?.contains(target) && !popupRef()?.contains(target)) close()
      },
      { signal: controller.signal },
    )
    onCleanup(() => controller.abort())
  })
}

export function Select(props: SelectProps) {
  const [open, setOpen] = createSignal(false)
  const [localValue, setLocalValue] = createSignal(props.value ?? props.options[0]?.value ?? '')
  let container!: HTMLDivElement
  let popup: HTMLDivElement | undefined
  const [portalHost, setPortalHost] = createSignal<HTMLElement>()
  const [popupElement, setPopupElement] = createSignal<HTMLDivElement>()
  const selected = () => props.value ?? localValue()
  const selectedLabel = () =>
    props.options.find(option => option.value === selected())?.label ?? props.placeholder ?? ''
  const hasValue = () => selected() !== '' && selected() !== undefined
  closeOnOutside(
    () => container,
    () => popup,
    () => setOpen(false),
  )

  onMount(() => {
    const host = createPopupPortalHost(container, props.mountTo)
    setPortalHost(host)
    onCleanup(() => host.remove())
  })

  createEffect(() => {
    const floating = popupElement()
    if (!open() || !floating) return
    const cleanup = autoPositionPopup(container, floating, { matchWidth: true })
    onCleanup(cleanup)
  })

  function choose(value: OptionValue) {
    setLocalValue(value)
    props.onChange?.(value)
    setOpen(false)
  }

  function clear(event: MouseEvent) {
    event.stopPropagation()
    setLocalValue('')
    props.onChange?.('')
    setOpen(false)
  }

  return (
    <div
      ref={element => (container = element)}
      id={props.id}
      class="group relative w-full max-w-full min-w-0"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        data-fui-status={props.status}
        aria-expanded={open()}
        aria-busy={props.loading}
        disabled={props.disabled}
        onClick={() => {
          if (open()) {
            setOpen(false)
            return
          }
          setOpen(true)
        }}
        class={`${triggerClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span
          class={`min-w-0 flex-1 truncate text-left ${hasValue() ? '' : 'text-(--fui-text-subtle)'}`}
        >
          {selectedLabel()}
        </span>
        <Show
          when={props.loading}
          fallback={<Icon name="chevron-down" class="size-4 shrink-0 text-(--fui-interactive)" />}
        >
          <Icon name="spinner" class="size-4 shrink-0 animate-spin text-(--fui-interactive)" />
        </Show>
      </button>
      <Show when={props.clearable && hasValue() && !props.loading && !props.disabled}>
        <button
          type="button"
          aria-label={props.clearLabel ?? 'Clear selection'}
          onClick={clear}
          class="absolute top-1/2 right-8 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded bg-(--fui-surface) text-(--fui-text-muted) opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-(--fui-text) focus-visible:opacity-100"
        >
          <Icon name="close" class="size-3.5" />
        </button>
      </Show>
      <Show when={open() && portalHost()}>
        <Portal mount={portalHost()!}>
          <div
            ref={element => {
              popup = element
              setPopupElement(element)
            }}
            role="listbox"
            aria-busy={props.loading}
            class={`${popupClass} py-1`}
          >
            <Show when={props.loading}>
              <div role="status" class="px-3 py-5 text-center text-[12px] text-(--fui-text-subtle)">
                {props.loadingLabel ?? 'Loading...'}
              </div>
            </Show>
            <Show when={!props.loading}>
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
                    <span class="min-w-0 flex-1 truncate">
                      {props.renderOption
                        ? props.renderOption(option, selected() === option.value)
                        : option.label}
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
