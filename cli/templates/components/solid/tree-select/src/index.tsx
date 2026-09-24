import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
import type { TreeOption, TreeSelectProps } from './types'
const popupClass =
  'absolute left-0 right-0 top-[38px] z-50 overflow-hidden rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) shadow-[0_3px_10px_rgba(0,0,0,.16)]'
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
function treeHasMatch(option: TreeOption, parent: string, query: string): boolean {
  const path = parent ? `${parent} / ${option.label}` : option.label
  return (
    path.toLowerCase().includes(query) ||
    (option.children?.some(child => treeHasMatch(child, path, query)) ?? false)
  )
}
function findPathByValue(
  options: TreeOption[],
  value: OptionValue,
  parent = '',
): string | undefined {
  for (const option of options) {
    const path = parent ? `${parent} / ${option.label}` : option.label
    if (!option.children?.length && (option.value ?? path) === value) return path
    const childPath = findPathByValue(option.children ?? [], value, path)
    if (childPath) return childPath
  }
}
function valueForPath(options: TreeOption[], targetPath: string, parent = ''): OptionValue {
  for (const option of options) {
    const path = parent ? `${parent} / ${option.label}` : option.label
    if (path === targetPath) return option.value ?? path
    const childPath = valueForPath(option.children ?? [], targetPath, path)
    if (childPath !== targetPath) return childPath
  }
  return targetPath
}
function collectExpanded(options: TreeOption[], selectedPath: string, parent = ''): string[] {
  const paths: string[] = []
  for (const option of options) {
    const path = parent ? `${parent} / ${option.label}` : option.label
    const selectedAncestor = selectedPath.startsWith(`${path} / `)
    if (option.children?.length && (option.expanded || selectedAncestor)) paths.push(path)
    paths.push(...collectExpanded(option.children ?? [], selectedPath, path))
  }
  return paths
}
function TreeBranch(props: {
  option: TreeOption
  parentPath: string
  query: () => string
  selectedPath: () => string
  expandedPaths: () => string[]
  toggleExpand: (path: string, parentPath: string, expand: boolean) => void
  onSelect: (path: string) => void
  renderOption?: TreeSelectProps['renderOption']
}) {
  const path = () =>
    props.parentPath ? `${props.parentPath} / ${props.option.label}` : props.option.label
  const selected = () => props.selectedPath() === path()
  const hasChildren = () => !!props.option.children?.length
  const visible = () =>
    !props.query() || treeHasMatch(props.option, props.parentPath, props.query())
  const expanded = () =>
    props.expandedPaths().includes(path()) ||
    props.selectedPath().startsWith(`${path()} / `) ||
    !!props.query()
  const depth = () => props.parentPath.split(' / ').filter(Boolean).length
  return (
    <Show when={visible()}>
      <div>
        <Show
          when={hasChildren()}
          fallback={
            <button
              type="button"
              role="treeitem"
              aria-selected={selected()}
              disabled={props.option.disabled}
              onClick={() => props.onSelect(path())}
              class={`${optionClass} ${selected() ? 'bg-(--fui-surface-selected)' : ''} disabled:opacity-50`}
              style={{ 'padding-left': `${8 + depth() * 16}px`, 'padding-right': '8px' }}
            >
              {props.renderOption ? (
                props.renderOption(props.option, selected(), path())
              ) : (
                <>
                  <span class="flex-1">{props.option.label}</span>
                  <Show when={selected()}>
                    <svg
                      class="size-3.5 text-(--fui-text-muted)"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                    >
                      <path d="m4 10 4 4 8-8" />
                    </svg>
                  </Show>
                </>
              )}
            </button>
          }
        >
          <button
            type="button"
            aria-expanded={expanded()}
            onClick={() => props.toggleExpand(path(), props.parentPath, !expanded())}
            class="flex h-[30px] w-full items-center px-1.5 text-left hover:bg-(--fui-surface-hover)"
            style={{ 'padding-left': `${6 + depth() * 16}px` }}
          >
            <svg
              class={`mr-0.5 size-4 text-(--fui-interactive) transition-transform ${expanded() ? 'rotate-90' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7 5l6 5-6 5V5z" />
            </svg>
            <span class={depth() === 0 ? 'font-medium' : ''}>{props.option.label}</span>
          </button>
          <Show when={expanded()}>
            <div>
              <For each={props.option.children}>
                {child => (
                  <TreeBranch
                    option={child}
                    parentPath={path()}
                    query={props.query}
                    selectedPath={props.selectedPath}
                    expandedPaths={props.expandedPaths}
                    toggleExpand={props.toggleExpand}
                    onSelect={props.onSelect}
                    renderOption={props.renderOption}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </Show>
  )
}
export function TreeSelect(props: TreeSelectProps) {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [localValue, setLocalValue] = createSignal<OptionValue>(props.value ?? '')
  let searchInput!: HTMLInputElement
  let container!: HTMLDivElement
  const selected = () => props.value ?? localValue()
  const selectedPath = (): string => {
    const path = findPathByValue(props.options, selected())
    if (path) return path
    const value = selected()
    return typeof value === 'string' ? value : ''
  }
  const [expandedPaths, setExpandedPaths] = createSignal(
    collectExpanded(props.options, selectedPath()),
  )

  closeOnOutside(
    () => container,
    () => setOpen(false),
  )
  function toggleExpand(path: string, parentPath: string, expand: boolean) {
    setExpandedPaths(current => {
      const next = current.filter(item => item !== path)
      if (!expand) return next
      if (props.expandMode === 'accordion') {
        const sameLevel = next.filter(item => {
          const parts = item.split(' / ')
          const itemParent = parts.length > 1 ? parts.slice(0, -1).join(' / ') : ''
          return itemParent !== parentPath
        })
        return [...sameLevel, path]
      }
      return [...next, path]
    })
  }
  function choose(path: string) {
    const value = valueForPath(props.options, path)
    setLocalValue(value)
    props.onChange?.(value)
    setOpen(false)
    setQuery('')
  }
  return (
    <div ref={element => (container = element)} id={props.id} class="relative max-w-[520px]">
      <button
        type="button"
        aria-haspopup="tree"
        data-fui-status={props.status}
        aria-expanded={open()}
        onClick={() => {
          const next = !open()
          setOpen(next)
          if (next) queueMicrotask(() => searchInput?.focus())
        }}
        class={`flex h-(--fui-control-height) w-full items-center rounded-(--fui-radius) border border-(--fui-border) bg-(--fui-surface) px-2.5 text-[14px] outline-none hover:border-(--fui-text-subtle) focus:border-(--fui-interactive) focus:ring-1 focus:ring-(--fui-focus)`}
      >
        <span class="min-w-0 flex-1 truncate text-left">
          {selectedPath() || props.placeholder || 'Select...'}
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
                onInput={event => setQuery(event.currentTarget.value.toLowerCase().trim())}
                placeholder={props.filterPlaceholder ?? 'Filter...'}
                class="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--fui-text-disabled)"
              />
            </div>
          </div>
          <div role="tree" class="fui-scrollbar max-h-[280px] overflow-y-auto py-1 text-[13px]">
            <For each={props.options}>
              {option => (
                <TreeBranch
                  option={option}
                  parentPath=""
                  query={query}
                  selectedPath={selectedPath}
                  expandedPaths={expandedPaths}
                  toggleExpand={toggleExpand}
                  onSelect={choose}
                  renderOption={props.renderOption}
                />
              )}
            </For>
            <Show
              when={query() && !props.options.some(option => treeHasMatch(option, '', query()))}
            >
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
