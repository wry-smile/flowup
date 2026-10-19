import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'

import { Select } from '../../select'
import type { DateTimePickerProps, DateTimeRangeValue, DateTimeValue } from './types'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dateButtonClass =
  'flex size-8 items-center justify-center rounded-(--fui-radius) text-[13px] text-(--fui-text) hover:bg-(--fui-surface-hover) focus-visible:outline-2 focus-visible:outline-(--fui-interactive)'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function asRange(value: DateTimeValue | undefined): DateTimeRangeValue {
  return typeof value === 'object' && value !== null ? value : { start: '', end: '' }
}

function datePart(value: string): string {
  return value.slice(0, 10)
}

function timePart(value: string): string {
  const time = value.includes('T')
    ? value.slice(value.indexOf('T') + 1)
    : value.includes(' ')
      ? value.slice(11)
      : /^\d{2}:\d{2}/.test(value)
        ? value
        : ''
  return time ? (time.length === 5 ? `${time}:00` : time) : '00:00:00'
}

function combine(date: string, time: string): string {
  return date ? `${date} ${time.length === 5 ? `${time}:00` : time}` : ''
}

function parseDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function createPortalHost(anchor: HTMLElement, mountTo?: HTMLElement | string): HTMLElement {
  let target: HTMLElement
  if (mountTo instanceof HTMLElement) target = mountTo
  else if (typeof mountTo === 'string')
    target = document.querySelector<HTMLElement>(mountTo) ?? document.body
  else target = document.body

  const scopeRoot = anchor.closest<HTMLElement>('[data-flowup-scope]')
  const host = document.createElement('div')
  const scope = scopeRoot?.getAttribute('data-flowup-scope')
  const theme = scopeRoot?.getAttribute('data-fui-theme')
  if (scope) host.setAttribute('data-flowup-scope', scope)
  if (theme) host.setAttribute('data-fui-theme', theme)
  target.append(host)
  return host
}

export function DateTimePicker(props: DateTimePickerProps) {
  const [localValue, setLocalValue] = createSignal<DateTimeValue>(props.value ?? '')
  const [open, setOpen] = createSignal(false)
  const [view, setView] = createSignal(new Date())
  const [portalHost, setPortalHost] = createSignal<HTMLElement>()
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement>()
  let trigger!: HTMLButtonElement
  let panel: HTMLDivElement | undefined
  const mode = () => props.mode ?? 'datetime'
  const isRange = () => mode() === 'date-range' || mode() === 'datetime-range'
  const hasTime = () => mode() === 'time' || mode() === 'datetime' || mode() === 'datetime-range'
  const currentValue = () => (props.value !== undefined ? props.value : localValue())
  const rangeValue = () => asRange(currentValue())
  const singleValue = (): string => {
    const value = currentValue()
    return typeof value === 'string' ? value : ''
  }

  function emit(value: DateTimeValue) {
    setLocalValue(value)
    props.onChange?.(value)
  }

  function openPicker() {
    const anchorDate = isRange() ? rangeValue().start : singleValue()
    const date = parseDate(datePart(anchorDate)) ?? new Date()
    setView(new Date(date.getFullYear(), date.getMonth(), 1))
    setOpen(true)
  }

  function selectDate(date: Date) {
    const selected = dateString(date)
    if (!isRange()) {
      if (mode() === 'date') {
        emit(selected)
        setOpen(false)
      } else {
        emit(combine(selected, timePart(singleValue())))
      }
      return
    }

    const range = rangeValue()
    if (!range.start || range.end) {
      emit({
        start: mode() === 'datetime-range' ? combine(selected, '00:00:00') : selected,
        end: '',
      })
      return
    }

    const firstDate = datePart(range.start)
    if (selected < firstDate) {
      emit({
        start: mode() === 'datetime-range' ? combine(selected, '00:00:00') : selected,
        end: range.start,
      })
    } else {
      emit({
        start: range.start,
        end: mode() === 'datetime-range' ? combine(selected, '00:00:00') : selected,
      })
    }
  }

  function changeTime(value: string, endpoint?: 'start' | 'end') {
    if (mode() === 'time') {
      emit(value.length === 5 ? `${value}:00` : value)
      return
    }
    if (mode() === 'datetime') {
      emit(combine(datePart(singleValue()), value))
      return
    }
    if (mode() === 'datetime-range' && endpoint) {
      const range = rangeValue()
      const current = range[endpoint]
      const date = datePart(current) || dateString(new Date())
      emit({ ...range, [endpoint]: combine(date, value) })
    }
  }

  function changeTimePart(
    source: string,
    index: number,
    nextValue: string,
    endpoint?: 'start' | 'end',
  ) {
    const parts = timePart(source).split(':')
    const number = Number(nextValue.slice(-2))
    if (!Number.isFinite(number)) return
    parts[index] = pad(Math.max(0, Math.min(index === 0 ? 23 : 59, number)))
    changeTime(parts.join(':'), endpoint)
  }

  function TimeFields(fieldProps: { value: () => string; endpoint?: 'start' | 'end' }) {
    const segments = ['Hour', 'Minute', 'Second']
    return (
      <div class="flex items-center gap-0" aria-label="Time">
        <For each={segments}>
          {(part, index) => (
            <div
              class={`w-[72px] shrink-0 ${
                index() === 0
                  ? '[&>div>button]:rounded-r-none'
                  : index() === segments.length - 1
                    ? '[&>div>button]:rounded-l-none [&>div>button]:border-l-0'
                    : '[&>div>button]:rounded-none [&>div>button]:border-l-0'
              }`}
            >
              <Select
                options={Array.from({ length: index() === 0 ? 24 : 60 }, (_, value) => {
                  const padded = pad(value)
                  return { value: padded, label: padded }
                })}
                value={timePart(fieldProps.value()).split(':')[index()]}
                disabled={props.disabled || (Boolean(fieldProps.endpoint) && !fieldProps.value())}
                onChange={nextValue =>
                  changeTimePart(
                    fieldProps.value(),
                    index(),
                    String(nextValue),
                    fieldProps.endpoint,
                  )
                }
                mountTo={props.mountTo}
              />
            </div>
          )}
        </For>
      </div>
    )
  }

  function labelFor(value: string): string {
    if (!value) return ''
    if (mode() === 'time') return value
    const date = datePart(value)
    const time = timePart(value)
    return mode() === 'datetime' || mode() === 'datetime-range' ? `${date} ${time}` : date
  }

  const calendarDates = () => {
    const first = view()
    const start = new Date(first.getFullYear(), first.getMonth(), 1)
    const mondayOffset = (start.getDay() + 6) % 7
    const gridStart = new Date(start.getFullYear(), start.getMonth(), 1 - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }

  const dateDisabled = (date: Date) => {
    const current = dateString(date)
    return (
      (props.min && current < datePart(props.min)) || (props.max && current > datePart(props.max))
    )
  }

  const dateSelected = (date: Date) => {
    const current = dateString(date)
    if (!isRange()) return datePart(singleValue()) === current
    const range = rangeValue()
    return datePart(range.start) === current || datePart(range.end) === current
  }

  const dateInRange = (date: Date) => {
    if (!isRange()) return false
    const range = rangeValue()
    const current = dateString(date)
    return Boolean(
      range.start && range.end && current > datePart(range.start) && current < datePart(range.end),
    )
  }

  onMount(() => {
    if (!trigger) return
    const host = createPortalHost(trigger, props.mountTo)
    setPortalHost(host)
    onCleanup(() => host.remove())
  })

  createEffect(() => {
    const floating = panelElement()
    if (!open() || !floating) return
    const update = () => {
      void computePosition(trigger, floating, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (floating.isConnected) {
          Object.assign(floating.style, { left: `${x}px`, top: `${y}px`, visibility: 'visible' })
        }
      })
    }
    floating.style.visibility = 'hidden'
    onCleanup(autoUpdate(trigger, floating, update))
  })

  onMount(() => {
    const controller = new AbortController()
    document.addEventListener(
      'pointerdown',
      event => {
        const target = event.target as Node
        if (target instanceof Element && target.closest('[role="listbox"]')) return
        if (!trigger.contains(target) && !panel?.contains(target)) setOpen(false)
      },
      { signal: controller.signal },
    )
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') setOpen(false)
      },
      { signal: controller.signal },
    )
    onCleanup(() => controller.abort())
  })

  return (
    <div class="w-full min-w-0">
      <button
        ref={element => (trigger = element)}
        id={props.id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open()}
        disabled={props.disabled}
        data-fui-status={props.status}
        onClick={() => (open() ? setOpen(false) : openPicker())}
        class="flex h-(--fui-control-height) w-full min-w-0 items-center justify-between gap-2 rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-left text-[14px] text-(--fui-text) outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus) disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span class="min-w-0 flex-1 truncate">
          <Show
            when={!isRange()}
            fallback={
              <>
                {labelFor(rangeValue().start) || props.startLabel || 'Start'}
                <span class="px-2 text-(--fui-text-subtle)">–</span>
                {labelFor(rangeValue().end) || props.endLabel || props.emptyRangeLabel || 'End'}
              </>
            }
          >
            {labelFor(singleValue()) ||
              props.placeholder ||
              (mode() === 'time' ? 'Select time...' : 'Select date and time...')}
          </Show>
        </span>
        <span aria-hidden="true" class="shrink-0 text-(--fui-text-subtle)">
          ▦
        </span>
      </button>

      <Show when={open() && portalHost()}>
        <Portal mount={portalHost()!}>
          <div
            ref={element => {
              panel = element
              setPanelElement(element)
            }}
            role="dialog"
            aria-label={isRange() ? 'Choose date range' : 'Choose date'}
            class="fixed z-50 w-[296px] max-w-[calc(100vw-1rem)] rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) p-3 text-(--fui-text) shadow-[0_3px_10px_rgba(0,0,0,.16)]"
          >
            <Show when={mode() !== 'time'}>
              <div class="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setView(new Date(view().getFullYear(), view().getMonth() - 1, 1))}
                  class="flex size-7 items-center justify-center rounded hover:bg-(--fui-surface-hover)"
                >
                  ‹
                </button>
                <span class="text-[13px] font-medium">
                  {monthLabel(view().getFullYear(), view().getMonth())}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setView(new Date(view().getFullYear(), view().getMonth() + 1, 1))}
                  class="flex size-7 items-center justify-center rounded hover:bg-(--fui-surface-hover)"
                >
                  ›
                </button>
              </div>
            </Show>
            <Show when={mode() === 'time'}>
              <label class="flex items-center justify-between gap-3 text-[12px] text-(--fui-text-muted)">
                Time
                <TimeFields value={singleValue} />
              </label>
            </Show>
            <Show when={mode() !== 'time'}>
              <div class="grid grid-cols-7 justify-items-center">
                <For each={weekdays}>
                  {day => <span class="pb-1 text-[11px] text-(--fui-text-subtle)">{day}</span>}
                </For>
                <For each={calendarDates()}>
                  {date => {
                    const currentMonth = () => date.getMonth() === view().getMonth()
                    const selected = () => dateSelected(date)
                    const inRange = () => dateInRange(date)
                    const today = () => dateString(date) === dateString(new Date())
                    return (
                      <button
                        type="button"
                        aria-label={date.toLocaleDateString()}
                        aria-pressed={selected()}
                        disabled={Boolean(props.disabled || dateDisabled(date))}
                        onClick={() => selectDate(date)}
                        class={`${dateButtonClass} ${currentMonth() ? '' : 'text-(--fui-text-disabled)'} ${inRange() ? 'rounded-none bg-(--fui-surface-muted)' : ''} ${selected() ? 'bg-(--fui-interactive) text-(--fui-surface)' : ''} ${today() && !selected() ? 'font-semibold underline' : ''} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  }}
                </For>
              </div>
            </Show>
            <Show when={hasTime()}>
              <div class="mt-3 grid gap-2 border-t border-(--fui-border-soft) pt-3">
                <Show when={mode() === 'datetime'}>
                  <label class="flex items-center justify-between gap-3 text-[12px] text-(--fui-text-muted)">
                    Time
                    <TimeFields value={singleValue} />
                  </label>
                </Show>
                <Show when={mode() === 'datetime-range'}>
                  <For each={['start', 'end'] as const}>
                    {endpoint => {
                      const range = () => rangeValue()
                      const endpointValue = () => range()[endpoint]
                      return (
                        <label class="flex items-center justify-between gap-3 text-[12px] text-(--fui-text-muted)">
                          {endpoint === 'start'
                            ? (props.startLabel ?? 'Start')
                            : (props.endLabel ?? 'End')}
                          <TimeFields value={endpointValue} endpoint={endpoint} />
                        </label>
                      )
                    }}
                  </For>
                </Show>
              </div>
            </Show>
            <div class="mt-3 flex justify-end gap-2 border-t border-(--fui-border-soft) pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                class="h-7 rounded-(--fui-radius) border border-(--fui-border) px-2.5 text-[12px] hover:bg-(--fui-surface-hover)"
              >
                Done
              </button>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
