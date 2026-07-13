import type { GenOptions, GenResolved, GenType } from './impl'
import type { ClientFramework } from './context'
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
      validate: (value) => {
        if (!value || !value.trim())
          return 'Name is required'
        if (!/^[a-z][a-z0-9-]*$/.test(value.trim()))
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

  if (answers.type === 'plugin') {
    answers.framework = 'vanilla'
    answers.tailwind = false
  }
  else if (options.framework === undefined) {
    answers.framework = await selectOrExit<ClientFramework>({
      message: 'Select client framework?',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'svelte', label: 'Svelte' },
        { value: 'vue', label: 'Vue' },
      ],
      initialValue: 'vanilla',
    })
  }
  else {
    answers.framework = options.framework
  }

  if (answers.type === 'plugin' || answers.framework === 'vanilla') {
    answers.tailwind = false
  }
  else if (options.tailwind === undefined) {
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
