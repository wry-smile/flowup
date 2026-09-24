export interface TabItem {
  id: string
  label: string
  content: import('solid-js').JSX.Element
}
export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  class?: string
}
