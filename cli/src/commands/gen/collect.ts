/**
 * 走 @clack/prompts 收集缺失字段。预先把 default 都用 env 来的值填好。
 *
 * 之前散在 gen/index.ts:collectMissing(308 行里占了 ~100 行)。抽出来是因为：
 * 1. 主体 impl.ts 只关心「参数齐了 → 跑 / 没齐 → 报错」,collect 是交互细节。
 * 2. collect 里 5 处 `isCancel → exit(0)` 现在统一在 share/prompts.ts 包装。
 */

import type { GenOptions, GenResolved, GenType } from './impl'
import type { LocaleCode } from './locale'
import { kebabCase } from '../../share/paths'
import { confirmOrExit, multiselectOrExit, selectOrExit, textOrExit } from '../../share/prompts'
import { DEFAULT_LOCALES, SUPPORTED_LOCALES } from './locale'

export async function collectMissing(options: GenOptions): Promise<GenResolved> {
  const answers: Partial<GenResolved> = {}

  if (options.type === undefined) {
    answers.type = await selectOrExit<GenType>({
      message: 'What do you want to add?',
      options: [
        { value: 'node', label: 'Node' },
        { value: 'plugin', label: 'Plugin' },
      ],
      initialValue: 'node',
    })
  }
  else {
    answers.type = options.type
  }

  if (options.name === undefined) {
    const raw = await textOrExit({
      message: `Enter the ${answers.type} name (kebab-case)?`,
      defaultValue: '',
      placeholder: 'my-special-node',
      validate: (v) => {
        if (!v || !v.trim())
          return 'Name is required'
        if (!/^[a-z][a-z0-9-]*$/.test(v.trim()))
          return 'Use kebab-case: lowercase letters, digits, dashes (must start with a letter)'
        return undefined
      },
    })
    answers.name = kebabCase(raw)
  }
  else {
    answers.name = kebabCase(options.name)
  }

  if (options.locales === undefined) {
    answers.locales = await multiselectOrExit<LocaleCode>({
      message: 'Select internationalization locales?',
      options: Object.entries(SUPPORTED_LOCALES).map(([value, label]) => ({
        value: value as LocaleCode,
        label,
      })),
      initialValues: DEFAULT_LOCALES,
      required: false,
    })
  }
  else {
    answers.locales = options.locales
  }

  if (options.vue === undefined) {
    answers.vue = await confirmOrExit({
      message: 'Use Vue (single-file components) for the client UI?',
      initialValue: false,
    })
  }
  else {
    answers.vue = options.vue
  }

  if (options.tailwind === undefined) {
    answers.tailwind = await confirmOrExit({
      message: 'Use Tailwindcss for styling?',
      initialValue: false,
    })
  }
  else {
    answers.tailwind = options.tailwind
  }

  return answers as GenResolved
}
