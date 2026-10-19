import type { Accessor, JSX } from 'solid-js'

export interface EditableListItemProps<T> {
  item: Accessor<T>
  index: Accessor<number>
  onChange: (item: T) => void
}

export type EditableListRow = HTMLElement

export interface EditableListEvent {
  preventDefault(): void
  stopPropagation(): void
}

export interface EditableListButton<T extends object = Record<string, unknown>> {
  label?: string
  icon?: string
  title?: string
  click?: (this: EditableListHandle<T>, event: EditableListEvent) => void
}

export interface EditableListHandle<T extends object> {
  addItem(item?: T): void
  addItems(items: T[]): void
  removeItem(item: T): void
  width(value?: number | string): number
  height(value?: number | string): number
  items(): T[]
  empty(): void
  filter(filter?: ((item: T) => boolean) | null): number
  show(item: T): void
  sort(sort?: (a: T, b: T) => number): void
  length(): number
  cancel(): void
}

export interface EditableListProps<T extends object> {
  items?: T[]
  addButton?: boolean | string
  buttons?: EditableListButton<T>[]
  connectWith?: string
  header?: JSX.Element
  height?: number | string
  removable?: boolean
  removeLabel?: string
  scrollOnAdd?: boolean
  sortable?: boolean | string
  filter?: (item: T) => boolean
  sort?: (a: T, b: T) => number
  onSort?: (items: T[]) => void
  onRemove?: (item: T) => void
  resize?: () => void
  resizeItem?: (row: HTMLElement, index: number) => void
  class?: string
  createItem?: () => T
  renderItem: (props: EditableListItemProps<T>) => JSX.Element
  onChange?: (items: T[]) => void
  ref?: (handle?: EditableListHandle<T>) => void
}
