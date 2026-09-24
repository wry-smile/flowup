export interface InputNumberProps {
  id?: string
  value?: number
  min?: number
  max?: number
  step?: number
  precision?: number
  increaseLabel?: string
  decreaseLabel?: string
  unit?: string
  disabled?: boolean
  status?: 'warning' | 'error'
  onChange?: (value: number) => void
}

export type NumberInputProps = InputNumberProps
