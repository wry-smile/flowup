import type { JSX } from 'solid-js'

import type { OptionValue } from '../../select/src/types'
export interface TreeOption {
  label: string
  value?: OptionValue
  children?: TreeOption[]
  expanded?: boolean
  disabled?: boolean
  [key: string]: unknown
}
export interface TreeSelectProps {
  id?: string
  options: TreeOption[]
  value?: OptionValue
  placeholder?: string
  filterPlaceholder?: string
  emptyLabel?: string
  onChange?: (value: OptionValue) => void
  expandMode?: 'multiple' | 'accordion'
  renderOption?: (option: TreeOption, selected: boolean, path: string) => JSX.Element
  status?: 'warning' | 'error'
}
