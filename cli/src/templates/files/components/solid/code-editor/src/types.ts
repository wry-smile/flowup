export interface CodeEditorProps {
  id?: string
  value?: string
  language?: string
  mode?: string
  height?: number
  minHeight?: number
  options?: Record<string, unknown>
  disabled?: boolean
  readOnly?: boolean
  status?: 'warning' | 'error'
  onChange?: (value: string) => void
}
