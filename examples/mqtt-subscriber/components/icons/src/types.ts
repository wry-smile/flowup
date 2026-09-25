export type IconName =
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'search'
  | 'spinner'
  | 'caret-down'
  | 'caret-up'

export interface IconProps {
  name: IconName
  class?: string
}
