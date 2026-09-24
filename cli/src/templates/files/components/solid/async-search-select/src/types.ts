import type { JSX } from 'solid-js'

import type { OptionValue, SelectOption, SelectProps } from '../../select/src/types'

export type { SelectOption }

export interface AsyncSearchSelectProps extends Omit<SelectProps, 'options' | 'onChange'> {
  loadOptions: (query: string, signal: AbortSignal) => Promise<SelectOption[]>
  onChange?: (value: OptionValue, option: SelectOption) => void
  valueLabel?: string
  searchPlaceholder?: string
  loadingLabel?: string
  emptyLabel?: string
  errorLabel?: string
  retryLabel?: string
  debounceMs?: number
  renderOption?: (option: SelectOption, selected: boolean) => JSX.Element
}
