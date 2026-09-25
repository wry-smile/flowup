export type TagVariant = 'default' | 'info' | 'warning'
export interface TagProps {
  variant?: TagVariant
  children: import('solid-js').JSX.Element
  class?: string
}
