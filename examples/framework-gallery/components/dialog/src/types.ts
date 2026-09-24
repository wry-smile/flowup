import type { JSX } from 'solid-js'
export interface DialogProps {
  open: boolean
  title: string
  children?: JSX.Element
  footer?: JSX.Element
  onClose: () => void
  closeLabel?: string
  mountTo?: HTMLElement | string
  class?: string
}
