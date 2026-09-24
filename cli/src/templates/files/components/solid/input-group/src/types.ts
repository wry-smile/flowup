import type { JSX } from 'solid-js'
export type InputGroupProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  prefix?: JSX.Element
  suffix?: JSX.Element
  status?: 'warning' | 'error'
}
