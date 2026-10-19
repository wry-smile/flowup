import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { Setter } from 'solid-js'

import type { EditableListHandle, EditableListProps } from './types'

interface EditableListEntry<T extends object> {
  data: T
  element?: HTMLLIElement
  owner: EditableListState<T>
}

interface EditableListState<T extends object> {
  entries: () => EditableListEntry<T>[]
  setEntries: Setter<EditableListEntry<T>[]>
  root?: HTMLElement
  options: EditableListProps<T>
}

interface DragState<T extends object> {
  entry: EditableListEntry<T>
  source: EditableListState<T>
  originalIndex: number
}

let activeDrag: DragState<any> | undefined

function cancelActiveDrag() {
  const drag = activeDrag
  if (!drag) return
  const currentOwner = drag.entry.owner
  if (currentOwner !== drag.source) {
    currentOwner.setEntries(current => current.filter(entry => entry !== drag.entry))
  }
  drag.entry.owner = drag.source
  drag.source.setEntries(current => {
    const next = current.filter(entry => entry !== drag.entry)
    next.splice(Math.min(drag.originalIndex, next.length), 0, drag.entry)
    return next
  })
  activeDrag = undefined
}

const handleDocumentKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') cancelActiveDrag()
}

export function EditableList<T extends object>(props: EditableListProps<T>) {
  const [entries, setEntries] = createSignal<EditableListEntry<T>[]>([])
  const [activeFilter, setActiveFilter] = createSignal<((item: T) => boolean) | null>(
    props.filter ?? null,
  )
  let container: HTMLDivElement | undefined
  let viewport: HTMLDivElement | undefined
  let listElement: HTMLOListElement | undefined
  let dragAllowed = false
  let resizeObserver: ResizeObserver | undefined

  const state: EditableListState<T> = {
    entries,
    setEntries,
    options: props,
  }
  const visibleEntries = () =>
    entries().filter(entry => !activeFilter() || activeFilter()!(entry.data))
  const getContainer = () => {
    if (!container) throw new Error('EditableList is not mounted')
    return container
  }
  const getViewport = () => {
    if (!viewport) throw new Error('EditableList is not mounted')
    return viewport
  }
  const getListElement = () => {
    if (!listElement) throw new Error('EditableList is not mounted')
    return listElement
  }

  function emitChange() {
    props.onChange?.(entries().map(entry => entry.data))
  }

  function emitSortItems() {
    props.onSort?.(entries().map(entry => entry.data))
    emitChange()
  }

  function createEntry(data: T): EditableListEntry<T> {
    return { data, owner: state }
  }

  function addItem(data?: T) {
    const entry = createEntry(data ?? props.createItem?.() ?? ({} as T))
    setEntries(current => [...current, entry])
    if (props.scrollOnAdd !== false) {
      requestAnimationFrame(() => entry.element?.scrollIntoView({ block: 'nearest' }))
    }
    emitChange()
    return entry
  }

  function removeEntry(entry: EditableListEntry<T>) {
    setEntries(current => current.filter(item => item !== entry))
    props.onRemove?.(entry.data)
    emitChange()
  }

  function moveEntry(
    entry: EditableListEntry<T>,
    target: EditableListState<T>,
    before?: EditableListEntry<T>,
  ) {
    if (entry.owner !== target && !canConnect(entry.owner, target)) return

    entry.owner.setEntries(current => current.filter(item => item !== entry))
    const next = target.entries().filter(item => item !== entry)
    const targetIndex = before ? next.indexOf(before) : -1
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, entry)
    entry.owner = target
    target.setEntries(next)
    entry.element?.scrollIntoView({ block: 'nearest' })
  }

  function canConnect(source: EditableListState<T>, target: EditableListState<T>) {
    if (source === target) return true
    const selector = source.options.connectWith
    return Boolean(selector && target.root?.matches(selector))
  }

  function startDrag(event: DragEvent, entry: EditableListEntry<T>) {
    const sortable = props.sortable
    if (!sortable) {
      event.preventDefault()
      return
    }
    const selector = typeof sortable === 'string' ? sortable : '[data-editable-handle]'
    if (!dragAllowed || !(event.target instanceof Element) || !event.target.closest(selector)) {
      event.preventDefault()
      return
    }

    const element = entry.element
    if (!element?.parentNode) return
    activeDrag = {
      entry,
      source: entry.owner,
      originalIndex: entry.owner.entries().indexOf(entry),
    }
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  const handle: EditableListHandle<T> = {
    addItem(item) {
      addItem(item)
    },
    addItems(items) {
      for (const item of items) addItem(item)
    },
    removeItem(item) {
      const entry = entries().find(candidate => candidate.data === item)
      if (entry) removeEntry(entry)
    },
    width(value) {
      if (value === undefined) return getContainer().getBoundingClientRect().width
      getContainer().style.width = typeof value === 'number' ? `${value}px` : value
      return getContainer().getBoundingClientRect().width
    },
    height(value) {
      if (value === undefined) return getContainer().getBoundingClientRect().height
      if (value === 'auto') {
        getContainer().style.height = 'auto'
        getViewport().style.overflowY = 'visible'
      } else {
        getContainer().style.height = typeof value === 'number' ? `${value}px` : value
        getViewport().style.overflowY = 'auto'
      }
      props.resize?.()
      return getContainer().getBoundingClientRect().height
    },
    items() {
      return entries().map(entry => entry.data)
    },
    empty() {
      setEntries([])
      emitChange()
    },
    filter(filter) {
      if (filter !== undefined) setActiveFilter(() => filter)
      return visibleEntries().length
    },
    show(item) {
      const entry = entries().find(candidate => candidate.data === item)
      entry?.element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    sort(sort) {
      const comparator = sort ?? props.sort
      if (!comparator) return
      setEntries(current => [...current].sort((a, b) => comparator(a.data, b.data)))
      emitSortItems()
    },
    length() {
      return entries().length
    },
    cancel: cancelActiveDrag,
  }

  onMount(() => {
    state.root = getContainer()
    setEntries((props.items ?? []).map(createEntry))
    if (props.height !== undefined) handle.height(props.height)
    props.ref?.(handle)
    resizeObserver = new ResizeObserver(() => {
      props.resize?.()
      entries().forEach((entry, index) => {
        if (entry.element) props.resizeItem?.(entry.element, index)
      })
    })
    resizeObserver.observe(getContainer())
    document.addEventListener('keydown', handleDocumentKeyDown)
    onCleanup(() => document.removeEventListener('keydown', handleDocumentKeyDown))
  })

  onCleanup(() => {
    resizeObserver?.disconnect()
    props.ref?.()
    if (activeDrag?.source === state) activeDrag = undefined
  })

  return (
    <div
      ref={element => (container = element)}
      class={`flex w-full min-w-0 flex-col overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) font-sans text-[13px] leading-[1.5] text-(--fui-text) ${props.class ?? ''}`}
      onDragOver={event => {
        const drag = activeDrag
        if (!drag || !canConnect(drag.source, state)) return
        event.preventDefault()
        const target = (event.target as HTMLElement).closest('li') as HTMLLIElement | null
        const before = target ? entries().find(entry => entry.element === target) : undefined
        if (before === drag.entry) return
        moveEntry(drag.entry, state, before)
      }}
      onDrop={event => event.preventDefault()}
      onPointerDown={event => {
        const sortable = props.sortable
        const selector = typeof sortable === 'string' ? sortable : '[data-editable-handle]'
        dragAllowed = Boolean(sortable && (event.target as HTMLElement).closest(selector))
      }}
    >
      <Show when={props.header}>
        <div class="shrink-0 border-b border-(--fui-border) bg-(--fui-surface-hover) text-xs font-medium text-(--fui-text-muted)">
          {props.header}
        </div>
      </Show>
      <div ref={element => (viewport = element)} class="w-full min-h-0 min-w-0 flex-1 overflow-auto">
        <ol
          ref={element => (listElement = element)}
          class="m-0 list-none divide-y divide-(--fui-border-soft) p-0"
        >
          <For each={visibleEntries()}>
            {(entry, index) => (
              <li
                ref={element => (entry.element = element)}
                class="flex w-full min-w-0 min-h-[42px] items-stretch bg-(--fui-surface) hover:bg-(--fui-surface-soft)"
                draggable={Boolean(props.sortable)}
                onDragStart={event => startDrag(event, entry)}
                onDragEnd={() => {
                  const drag = activeDrag
                  if (drag) {
                    const destination = entry.owner
                    if (drag.source === destination) {
                      destination.setEntries(current => {
                        const order = [...getListElement().children]
                        return [...current].sort(
                          (a, b) => order.indexOf(a.element!) - order.indexOf(b.element!),
                        )
                      })
                    } else {
                      drag.source.setEntries(current =>
                        current.filter(item => item.owner === drag.source),
                      )
                    }
                    drag.source.options.onSort?.(drag.source.entries().map(item => item.data))
                    drag.source.options.onChange?.(drag.source.entries().map(item => item.data))
                    if (destination !== drag.source) {
                      destination.options.onSort?.(destination.entries().map(item => item.data))
                      destination.options.onChange?.(destination.entries().map(item => item.data))
                    }
                    activeDrag = undefined
                  }
                  dragAllowed = false
                }}
              >
                <Show when={props.sortable === true}>
                  <span
                    class="flex w-8 shrink-0 cursor-grab items-center justify-center border-r border-(--fui-border-soft) text-(--fui-text-subtle) select-none hover:text-(--fui-text-muted) active:cursor-grabbing"
                    data-editable-handle
                    aria-label="Drag item"
                  >
                    ⠿
                  </span>
                </Show>
                <div class="w-full min-w-0 flex-1 p-2">
                  {props.renderItem({
                    item: () => entry.data,
                    index,
                    onChange(data) {
                      entry.data = data
                      setEntries(current => [...current])
                      emitChange()
                    },
                  })}
                </div>
                <Show when={props.removable !== false}>
                  <button
                    type="button"
                    class="flex w-10 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-(--fui-text-subtle) hover:bg-(--fui-surface-hover) hover:text-(--fui-danger)"
                    title={props.removeLabel ?? 'Remove item'}
                    aria-label={props.removeLabel ?? 'Remove item'}
                    onClick={() => removeEntry(entry)}
                  >
                    <svg
                      class="size-5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="m19 6-1 14H6L5 6" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </div>
      <Show when={props.addButton !== false || (props.buttons?.length ?? 0) > 0}>
        <div class="flex shrink-0 items-center gap-1 border-t border-(--fui-border) bg-(--fui-surface-hover) p-1">
          <Show when={props.addButton !== false}>
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-xs text-(--fui-text-muted) shadow-sm hover:bg-(--fui-surface-muted) active:bg-(--fui-border-soft)"
              onClick={() => addItem()}
            >
              <span aria-hidden="true">+</span>
              {typeof props.addButton === 'string' ? props.addButton : 'Add item'}
            </button>
          </Show>
          <For each={props.buttons ?? []}>
            {button => (
              <button
                type="button"
                class="inline-flex h-7 items-center gap-1.5 rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-xs text-(--fui-text-muted) shadow-sm hover:bg-(--fui-surface-muted) active:bg-(--fui-border-soft)"
                title={button.title}
                onClick={event => button.click?.call(handle, event)}
              >
                <Show when={button.icon}>
                  {button.icon?.includes(' ') ? (
                    <i class={button.icon} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{button.icon}</span>
                  )}
                </Show>
                {button.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
