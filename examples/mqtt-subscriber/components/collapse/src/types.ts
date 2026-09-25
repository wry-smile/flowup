import type { JSX } from 'solid-js'
export interface CollapseProps {
  title: string
  children: JSX.Element
  open?: boolean
  defaultOpen?: boolean
  extra?: JSX.Element
  onToggle?: (open: boolean) => void
  class?: string
}
