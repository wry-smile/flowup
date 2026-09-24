import type { JSX } from 'solid-js'

export type OptionValue = string | number | boolean

export interface SelectOption {
  value: OptionValue
  label: string
  disabled?: boolean
  [key: string]: unknown
}

export interface SelectProps {
  id?: string
  options: SelectOption[]
  value?: OptionValue
  placeholder?: string
  onChange?: (value: OptionValue) => void
  renderOption?: (option: SelectOption, selected: boolean) => JSX.Element
  status?: 'warning' | 'error'
}
