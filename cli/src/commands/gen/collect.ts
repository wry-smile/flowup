import type { ClientFramework } from './context'
import type { GenOptions, GenResolved, GenType } from './impl'
import type { LocaleCode } from './locale'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
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
  } else {
    answers.type = options.type
  }

  if (options.name === undefined) {
    const raw = await promptEntryName(answers.type!, 'my-special-node')
    answers.name = kebabCase(raw)
  } else {
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
  } else {
    answers.locales = options.locales
  }

  const styling = await collectClientOptions(options)
  answers.framework = styling.framework
  answers.unocss = styling.unocss

  return answers as GenResolved
}

export async function promptEntryName(
  kind: string,
  placeholder: string,
  roots?: string | string[],
): Promise<string> {
  return textOrExit({
    message: `Enter the ${kind} name (kebab-case)`,
    placeholder,
    validate(value) {
      const name = value?.trim()
      if (!name) return 'Name is required'
      if (!/^[a-z][a-z0-9-]*$/.test(name))
        return 'Use kebab-case: lowercase letters, digits, and dashes.'
      if (
        roots &&
        (Array.isArray(roots) ? roots : [roots]).some(root => existsSync(resolve(root, name)))
      )
        return `${kind} "${name}" already exists. Choose another name.`
      return undefined
    },
  })
}

export async function collectClientOptions(
  options: Pick<GenOptions, 'framework' | 'unocss'>,
): Promise<{ framework: ClientFramework; unocss: boolean }> {
  const framework =
    options.framework ??
    (await selectOrExit<ClientFramework>({
      message: 'Select client framework',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'vue', label: 'Vue' },
        { value: 'svelte', label: 'Svelte' },
        { value: 'preact', label: 'Preact' },
        { value: 'solid', label: 'Solid' },
      ],
      initialValue: 'vanilla',
    }))
  const unocss =
    framework === 'vanilla'
      ? false
      : (options.unocss ??
        (await confirmOrExit({
          message: 'Use scoped UnoCSS for styling?',
          initialValue: false,
        })))
  return { framework, unocss }
}
