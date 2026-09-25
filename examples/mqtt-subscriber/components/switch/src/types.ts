export interface SwitchProps {
  label: string
  checked?: boolean
  disabled?: boolean
  status?: 'warning' | 'error'
  onChange?: (checked: boolean) => void
}
