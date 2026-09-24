import type { ParentProps } from 'solid-js'

export interface FormRowProps {
  label: string
  labelClass?: string
  layout?: 'horizontal' | 'vertical'
}
export type FormRowComponentProps = ParentProps<FormRowProps>
