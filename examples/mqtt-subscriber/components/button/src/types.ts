import type { JSX } from 'solid-js'
export type ButtonVariant = 'default' | 'primary' | 'danger'
export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}
