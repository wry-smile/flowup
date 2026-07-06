/**
 * flowup gen 的 commander 注册 + CLI option → GenOptions 转换。
 *
 * 入口在 bin/flowup.ts:registerGenCommand(program)。
 */

import type { Command } from 'commander'
import type { GenOptions } from './impl'
import process from 'node:process'
import { hasArgvFlag, parseBool, parseCsvList, stripQuotes } from '../../share/paths'
import { runGenerator } from './impl'

export function registerGenCommand(program: Command): void {
  program
    .command('gen')
    .description('Scaffold a new Node-RED node or plugin in the current directory (cd into target dir first).')
    .option('--type <type>', 'Type to generate: node or plugin', (v) => {
      if (v !== 'node' && v !== 'plugin')
        throw new Error(`--type must be "node" or "plugin", got "${v}"`)
      return v
    })
    .option('--name <name>', 'Name of the node or plugin (kebab-case)')
    .option('--locales <locales>', 'Comma-separated list of locales (e.g., en-US,zh-CN)')
    .option('--vue [bool]', 'Enable Vue (SFC) for the client UI (adds @vitejs/plugin-vue). Pass --vue=false to disable.', v => v)
    .option('--tailwind [bool]', 'Enable Tailwindcss (adds @tailwindcss/vite). Pass --tailwind=false to disable.', v => v)
    .option('--non-interactive', 'Error if any required option is missing instead of prompting', false)
    .action(async (options) => {
      try {
        const opts = toGenOptions(options)
        await runGenerator(opts)
      }
      catch (err) {
        console.error('Generator failed:', err)
        process.exit(1)
      }
    })
}

/**
 * commander options → GenOptions:
 * - 默认 `[bool]`/`[value]` option 不传时 commander 给空字符串或 true,要变回 undefined
 * - 字符串首尾引号剥掉(gen 接受 --name "my node")
 * - parseBool / parseCsvList 提供默认值容错
 */
function toGenOptions(options: Record<string, unknown>): GenOptions {
  return {
    type: hasArgvFlag('--type')
      ? stripQuotes(options.type) as 'node' | 'plugin'
      : undefined,
    name: hasArgvFlag('--name')
      ? stripQuotes(options.name) as string
      : undefined,
    locales: hasArgvFlag('--locales')
      ? (parseCsvList(options.locales as string | undefined) ?? undefined) as GenOptions['locales']
      : undefined,
    vue: hasArgvFlag('--vue')
      ? (() => {
          const raw = options.vue as string | undefined
          // commander 15 不传 --vue 返回 true,传了返回字符串。统一 parseBool,undefined 视作用户想启用。
          if (raw === undefined || raw === '' || raw === 'true')
            return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    tailwind: hasArgvFlag('--tailwind')
      ? (() => {
          const raw = options.tailwind as string | undefined
          if (raw === undefined || raw === '' || raw === 'true')
            return true
          return parseBool(raw) ?? true
        })()
      : undefined,
    nonInteractive: !!options.nonInteractive,
  }
}
