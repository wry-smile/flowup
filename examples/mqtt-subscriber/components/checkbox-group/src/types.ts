import type { OptionValue } from '../../select/src/types'

export interface ChoiceOption {
  label: string
  value?: OptionValue
  disabled?: boolean
}

export interface CheckboxGroupProps {
  options: ChoiceOption[]
  value?: OptionValue[]
  status?: 'warning' | 'error'
  onChange?: (values: OptionValue[]) => void
}
