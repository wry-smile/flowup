import type { JSX } from 'solid-js'
export type AlertStatus = 'info' | 'warning' | 'error'
export interface AlertProps {
  status?: AlertStatus
  children: JSX.Element
  class?: string
}
