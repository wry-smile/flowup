export interface RadioProps {
  name: string
  label: string
  checked?: boolean
  disabled?: boolean
  status?: 'warning' | 'error'
  onChange?: () => void
}
