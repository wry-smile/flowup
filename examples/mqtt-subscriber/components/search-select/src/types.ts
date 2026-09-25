import type { SelectOption, SelectProps } from '../../select/src/types'
export type { SelectOption }
export interface SearchSelectProps extends SelectProps {
  emptyLabel?: string
  searchPlaceholder?: string
}
