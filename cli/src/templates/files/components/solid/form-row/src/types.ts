import type { ParentProps } from 'solid-js'

export interface FormRowProps {
  label: string
  labelClass?: string
  layout?: 'horizontal' | 'vertical'
  required?: boolean
  error?: string
}
export type FormRowComponentProps = ParentProps<FormRowProps>
