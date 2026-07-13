import process from 'node:process'
import * as p from '@clack/prompts'

function handleCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Cancelled by user.')
    process.exit(0)
  }
  return value
}

export function textOrExit(options: Parameters<typeof p.text>[0]): Promise<string> {
  return p.text(options).then(handleCancel)
}

export function confirmOrExit(options: Parameters<typeof p.confirm>[0]): Promise<boolean> {
  return p.confirm(options).then(handleCancel)
}

export function selectOrExit<T>(options: Parameters<typeof p.select>[0]): Promise<T> {
  return p.select(options).then(handleCancel) as Promise<T>
}

export function multiselectOrExit<T>(options: Parameters<typeof p.multiselect>[0]): Promise<T[]> {
  return p.multiselect(options).then(handleCancel) as Promise<T[]>
}
