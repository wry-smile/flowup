import type { JSX } from 'solid-js'
export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: string
  status?: 'warning' | 'error'
}
