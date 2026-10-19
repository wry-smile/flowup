export interface RangeInputProps {
  id?: string
  value?: number
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  showValue?: boolean
  onChange?: (value: number) => void
}
