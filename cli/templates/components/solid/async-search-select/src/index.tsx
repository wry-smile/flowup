import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { AsyncSearchSelectProps, SelectOption } from './types'

const triggerClass =
  'flex h-(--fui-control-height) w-full items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)'

const popupClass =
  'absolute left-0 right-0 top-[38px] z-40 overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'

const optionClass =
  'flex h-[31px] w-full items-center px-2.5 text-left text-[13px] hover:bg-(--fui-surface-muted)'

export function AsyncSearchSelect(props: AsyncSearchSelectProps) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [options, setOptions] = createSignal<SelectOption[]>([])
  const [loading, setLoading] = createSignal(false)
  const [failed, setFailed] = createSignal(false)
  const [localValue, setLocalValue] = createSignal<OptionValue>(props.value ?? '')
  let searchInput!: HTMLInputElement
  let container!: HTMLDivElement
  let timer: ReturnType<typeof setTimeout> | undefined
  let activeController: AbortController | undefined
  let requestId = 0

  const selected = () => props.value ?? localValue()
  const selectedOption = () => options().find(option => option.value === selected())
  const selectedLabel = () => selectedOption()?.label ?? props.valueLabel

  async function requestOptions(search: string) {
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    const currentRequest = ++requestId
    setLoading(true)
    setFailed(false)

    try {
      const result = await props.loadOptions(search, controller.signal)
      if (!controller.signal.aborted && currentRequest === requestId) setOptions(result)
    } catch {
      if (!controller.signal.aborted && currentRequest === requestId) {
        setOptions([])
        setFailed(true)
      }
    } finally {
      if (!controller.signal.aborted && currentRequest === requestId) setLoading(false)
    }
  }

  function scheduleRequest(search: string, immediate = false) {
    if (timer) clearTimeout(timer)
    if (immediate) {
      void requestOptions(search)
      return
    }
    activeController?.abort()
    activeController = undefined
    requestId += 1
    setLoading(true)
    setFailed(false)
    timer = setTimeout(() => void requestOptions(search), Math.max(0, props.debounceMs ?? 250))
  }

  function cancelRequest() {
    if (timer) clearTimeout(timer)
    timer = undefined
    requestId += 1
    activeController?.abort()
    activeController = undefined
    setLoading(false)
  }

  function close() {
    setOpen(false)
    cancelRequest()
  }

  function toggle() {
    if (open()) {
      close()
      return
    }
    setOpen(true)
    setQuery('')
    scheduleRequest('', true)
    queueMicrotask(() => searchInput?.focus())
  }

  function choose(option: SelectOption) {
    setLocalValue(option.value)
    props.onChange?.(option.value, option)
    close()
  }

  onMount(() => {
    const controller = new AbortController()
    document.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if (!container?.contains(event.target as Node)) close()
      },
      { signal: controller.signal },
    )
    onCleanup(() => controller.abort())
  })

  onCleanup(() => {
    if (timer) clearTimeout(timer)
    activeController?.abort()
  })

  return (
    <div ref={element => (container = element)} id={props.id} class="relative max-w-[420px]">
      <button
        type="button"
        aria-haspopup="listbox"
        data-fui-status={props.status}
        aria-expanded={open()}
        onClick={toggle}
        class={triggerClass}
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
          aria-hidden="true"
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
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" />
              </svg>
              <input
                ref={element => (searchInput = element)}
                value={query()}
                onInput={event => {
                  const nextQuery = event.currentTarget.value
                  setQuery(nextQuery)
                  scheduleRequest(nextQuery)
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') close()
                  if (event.key === 'Enter' && !loading()) {
                    const firstEnabled = options().find(option => !option.disabled)
                    if (firstEnabled) choose(firstEnabled)
                  }
                }}
                placeholder={props.searchPlaceholder ?? 'Search...'}
                aria-label={props.searchPlaceholder ?? 'Search options'}
                class="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--fui-text-disabled)"
              />
            </div>
          </div>
          <div
            role="listbox"
            aria-busy={loading()}
            class="fui-scrollbar max-h-[220px] overflow-y-auto py-1"
          >
            <Show when={loading()}>
              <div role="status" class="px-3 py-5 text-center text-[12px] text-(--fui-text-subtle)">
                {props.loadingLabel ?? 'Loading...'}
              </div>
            </Show>
            <Show when={failed()}>
              <div class="px-3 py-4 text-center">
                <p role="alert" class="mb-2 text-[12px] text-(--fui-danger)">
                  {props.errorLabel ?? 'Could not load options'}
                </p>
                <button
                  type="button"
                  onClick={() => scheduleRequest(query(), true)}
                  class="rounded-[2px] border border-(--fui-border) px-2.5 py-1 text-[12px] hover:bg-(--fui-surface-muted)"
                >
                  {props.retryLabel ?? 'Try again'}
                </button>
              </div>
            </Show>
            <Show when={!loading() && !failed() && options().length > 0}>
              <For each={options()}>
                {option => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected() === option.value}
                    disabled={option.disabled}
                    onClick={() => choose(option)}
                    class={`${optionClass} ${selected() === option.value ? 'bg-(--fui-surface-selected)' : ''} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {props.renderOption
                      ? props.renderOption(option, selected() === option.value)
                      : option.label}
                  </button>
                )}
              </For>
            </Show>
            <Show when={!loading() && !failed() && options().length === 0}>
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
