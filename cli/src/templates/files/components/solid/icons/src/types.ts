export type IconName =
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'edit'
  | 'search'
  | 'spinner'
  | 'caret-down'
  | 'caret-up'

export interface IconProps {
  name: IconName
  class?: string
}
