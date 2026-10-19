export type DateTimeMode = 'date' | 'time' | 'datetime' | 'date-range' | 'datetime-range'

export interface DateTimeRangeValue {
  start: string
  end: string
}

export type DateTimeValue = string | DateTimeRangeValue

export interface DateTimePickerProps {
  id?: string
  value?: DateTimeValue
  mode?: DateTimeMode
  min?: string
  max?: string
  step?: number
  disabled?: boolean
  placeholder?: string
  startLabel?: string
  endLabel?: string
  emptyRangeLabel?: string
  status?: 'warning' | 'error'
  mountTo?: HTMLElement | string
  onChange?: (value: DateTimeValue) => void
}
