import type { OptionValue } from '../../select/src/types'

export interface ChoiceOption {
  label: string
  value?: OptionValue
  status?: 'warning' | 'error'
  disabled?: boolean
}

export interface RadioGroupProps {
  name: string
  options: ChoiceOption[]
  value?: OptionValue
  status?: 'warning' | 'error'
  onChange?: (value: OptionValue) => void
}
