import type { JSX } from 'solid-js'
import type { Placement } from '@floating-ui/dom'

export interface PopoverProps {
  id?: string
  trigger: JSX.Element
  children: JSX.Element
  open?: boolean
  placement?: Placement
  mountTo?: HTMLElement | string
  onOpenChange?: (open: boolean) => void
}
