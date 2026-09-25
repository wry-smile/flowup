import type { OptionValue } from '../../select/src/types'

export interface SegmentedOption {
  label: string
  value: OptionValue
  disabled?: boolean
}

export interface SegmentedProps {
  options: Array<string | SegmentedOption>
  value?: OptionValue
  status?: 'warning' | 'error'
  onChange?: (value: OptionValue) => void
}
