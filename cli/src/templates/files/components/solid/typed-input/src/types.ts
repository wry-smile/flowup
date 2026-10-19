export type TypedInputType = 'str' | 'num' | 'bool' | 'json' | 'msg' | 'flow' | 'global' | 'env'
export type TypedInputValue = string | number | boolean | null

export interface TypedInputProps {
  id?: string
  value?: TypedInputValue
  type?: TypedInputType
  types?: TypedInputType[]
  placeholder?: string
  disabled?: boolean
  status?: 'warning' | 'error'
  onChange?: (value: TypedInputValue, type: TypedInputType) => void
}
