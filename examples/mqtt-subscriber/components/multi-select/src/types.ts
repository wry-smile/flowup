import type { JSX } from 'solid-js'

import type { OptionValue } from '../../select/src/types'

export interface SelectOption {
  value: OptionValue
  label: string
  disabled?: boolean
  [key: string]: unknown
}

export interface MultiSelectProps {
  id?: string
  options: SelectOption[]
  value?: OptionValue[]
  placeholder?: string
  onChange?: (values: OptionValue[]) => void
  renderOption?: (option: SelectOption, selected: boolean) => JSX.Element
  status?: 'warning' | 'error'
  searchPlaceholder?: string
  clearLabel?: string
  clearable?: boolean
  emptyLabel?: string
  selectedCountText?: (count: number) => string
  mountTo?: HTMLElement | string
}
