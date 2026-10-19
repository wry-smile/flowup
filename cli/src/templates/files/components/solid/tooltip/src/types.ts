import type { JSX } from 'solid-js'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: JSX.Element
  placement?: TooltipPlacement
  children: JSX.Element
}
