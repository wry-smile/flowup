import type { JSX } from 'solid-js'

export interface TextInputProps {
  id?: string
  value?: string
  placeholder?: string
  description?: string
  disabled?: boolean
  clearable?: boolean
  clearLabel?: string
  status?: 'warning' | 'error'
  class?: string
  onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>
}
