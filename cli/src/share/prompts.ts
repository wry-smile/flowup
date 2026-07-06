/**
 * @clack/prompts 的轻量包装。
 *
 * 唯一目的:把「用户按 Ctrl+C / Esc 时 exit(0)」这套收尾逻辑集中到一个地方。
 * 当前 gen 命令有 5 处重复 `if (p.isCancel(ans)) p.cancel + process.exit(0)`,
 * 抽到 promptOrExit() / confirmOrExit() / textOrExit() / selectOrExit() / multiselectOrExit()。
 */

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
