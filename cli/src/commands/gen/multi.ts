import type { ClientFramework, FileMap } from './context'
import type { LocaleCode } from './locale'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { resolveCliVersion } from '../../share/cli-pkg'
import { isInMonorepo } from '../../share/monorepo'
import { confirmOrExit, multiselectOrExit, selectOrExit, textOrExit } from '../../share/prompts'
import { commitStagedDirectory, createStagingDir, isPathInside } from '../../share/safe-fs'
import { TEMPLATE_DEPENDENCY_VERSIONS } from '../../templates/dependency-versions'
import { renderSvelteTypes, renderVueTypes } from '../../templates/framework-assets'
import { nodeTemplate } from '../../templates/node'
import { pluginTemplate } from '../../templates/plugin'
import { createContext } from './context'
import { DEFAULT_LOCALES, SUPPORTED_LOCALES } from './locale'

export type MultiEntryType = 'node' | 'plugin'

export interface AddEntryOptions {
  type: MultiEntryType
  name: string
  framework?: ClientFramework
  unocss?: boolean
  locales?: LocaleCode[]
  packageRoot?: string
}

function validateName(name: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Invalid name: ${name}. Use kebab-case.`)
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function writeFiles(root: string, files: FileMap): Promise<void> {
  for (const [name, content] of Object.entries(files)) {
    const target = resolve(root, name)
    if (!isPathInside(root, target)) throw new Error(`Unsafe generated path: ${name}`)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf8')
  }
}

function renderMultiPackageConfig(scope: string): string {
  return `import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, presetFlowupWind4 } from '@wry-smile/flowup'

const root = import.meta.dirname
const entryDirs = ['nodes', 'plugins'].flatMap(group => {
  const directory = join(root, group)
  return existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => join(directory, entry.name))
    : []
})
const needsVue = entryDirs.some(dir => existsSync(join(dir, 'client/App.vue')))
const needsSvelte = entryDirs.some(dir => existsSync(join(dir, 'client/App.svelte')))
const needsUnoCSS = entryDirs.some(dir => {
  const client = join(dir, 'client/index.ts')
  return existsSync(client) && readFileSync(client, 'utf8').includes('virtual:uno.css')
})

const vueId: string = '@vitejs/plugin-vue'
const svelteId: string = '@sveltejs/vite-plugin-svelte'
const unocssId: string = 'unocss/vite'
const vue = needsVue ? (await import(/* @vite-ignore */ vueId)).default : undefined
const svelte = needsSvelte ? (await import(/* @vite-ignore */ svelteId)).svelte : undefined
const UnoCSS = needsUnoCSS ? (await import(/* @vite-ignore */ unocssId)).default : undefined

export default defineConfig({
  scope: '${scope}',
  client: {
    plugins: () => [
      ...(UnoCSS ? [UnoCSS({ presets: [presetFlowupWind4({ scope: '${scope}' })] })] : []),
      ...(vue ? [vue()] : []),
      ...(svelte ? [svelte()] : []),
    ],
  },
})
`
}

export async function generateMultiPackage(name: string): Promise<string> {
  validateName(name)
  const root = resolve(process.cwd(), name)
  if (!isPathInside(process.cwd(), root) || existsSync(root))
    throw new Error(`Target directory already exists or is unsafe: ${root}`)

  const version = resolveCliVersion()
  const flowupVersion = (await isInMonorepo()) ? 'workspace:*' : `^${version}`
  const dependencies = TEMPLATE_DEPENDENCY_VERSIONS
  const packageJson = {
    name: `flowup-${name}`,
    type: 'module',
    version: '1.0.0',
    private: true,
    main: `./dist/${name}-nodes.js`,
    files: ['dist'],
    scripts: { build: 'flowup build', dev: 'flowup dev' },
    'node-red': { scope: name, nodes: {}, plugins: {} },
    devDependencies: {
      '@types/jquery': dependencies['@types/jquery'],
      '@types/node': dependencies['@types/node'],
      '@types/node-red': dependencies['@types/node-red'],
      '@wry-smile/flowup': flowupVersion,
      'node-red': dependencies['node-red'],
      typescript: dependencies.typescript,
      vite: dependencies.vite,
    },
  }
  const files: FileMap = {
    'package.json': json(packageJson),
    'flowup.config.ts': renderMultiPackageConfig(name),
    'nodes/.gitkeep': '',
    'plugins/.gitkeep': '',
    'tsconfig.json': json({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        isolatedModules: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['vite/client', 'node', 'jquery'],
        allowArbitraryExtensions: true,
      },
      include: [
        'flowup.config.ts',
        'nodes/**/*.ts',
        'plugins/**/*.ts',
        'client-shared/**/*',
        'runtime-shared/**/*',
        'shared/**/*',
        'types/**/*.d.ts',
      ],
    }),
    'types/globals.d.ts': `/// <reference types="jquery" />\nimport type { EditorRED } from 'node-red'\n\ndeclare global {\n  const RED: EditorRED\n  const jQuery: JQueryStatic\n  const $: JQueryStatic\n}\nexport {}\n`,
    '.gitignore': 'dist\n.flowup\nnode_modules\n',
    'README.md': `# ${name}\n\nAdd entries with \`flowup gen add node example --framework vue --unocss\` or \`flowup gen add plugin sidebar\`. Then run \`pnpm install\` and \`pnpm build\`. Shared code belongs in \`shared/\`, \`runtime-shared/\`, or \`client-shared/\`.\n`,
  }

  const staging = await createStagingDir(root)
  try {
    await writeFiles(staging, files)
    await commitStagedDirectory(staging, root, { replaceExisting: false })
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
  console.info(
    `Generated multi-entry package at ${root}\nNext: cd ${name} && flowup gen add node example --framework vue --unocss`,
  )
  return root
}

export function isMultiEntryPackage(root = process.cwd()): boolean {
  return (
    (existsSync(resolve(root, 'nodes')) || existsSync(resolve(root, 'plugins'))) &&
    existsSync(resolve(root, 'flowup.config.ts')) &&
    existsSync(resolve(root, 'package.json'))
  )
}

export async function runMultiPackageGenerator(name?: string): Promise<void> {
  const packageName = name ?? (await promptName('package', 'my-package'))
  const root = await generateMultiPackage(packageName)
  if (name) return

  let addAnother = await confirmOrExit({
    message: 'Add a node or plugin to this package now?',
    initialValue: true,
  })
  while (addAnother) {
    await runAddEntryGenerator({}, root)
    addAnother = await confirmOrExit({
      message: 'Add another node or plugin?',
      initialValue: false,
    })
  }
  console.info(`Next: cd ${packageName} && pnpm install && pnpm build`)
}

export async function runAddEntryGenerator(
  options: Partial<AddEntryOptions> = {},
  packageRoot = process.cwd(),
): Promise<void> {
  if (!isMultiEntryPackage(packageRoot))
    throw new Error(
      'Run this command inside a multi-entry package, or use flowup gen package first.',
    )
  const type =
    options.type ??
    (await selectOrExit<MultiEntryType>({
      message: 'What do you want to add?',
      options: [
        { value: 'node', label: 'Node' },
        { value: 'plugin', label: 'Plugin' },
      ],
      initialValue: 'node',
    }))
  const name = options.name ?? (await promptName(type, type === 'node' ? 'my-node' : 'my-plugin'))
  const framework =
    options.framework ??
    (await selectOrExit<ClientFramework>({
      message: `Select the ${type} client framework`,
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'vue', label: 'Vue' },
        { value: 'svelte', label: 'Svelte' },
      ],
      initialValue: 'vanilla',
    }))
  const unocss =
    framework === 'vanilla'
      ? false
      : (options.unocss ??
        (await confirmOrExit({
          message: 'Use scoped UnoCSS?',
          initialValue: true,
        })))
  const locales =
    options.locales ??
    (await multiselectOrExit<LocaleCode>({
      message: 'Select locales for this entry',
      options: Object.entries(SUPPORTED_LOCALES).map(([value, label]) => ({
        value: value as LocaleCode,
        label,
      })),
      initialValues: DEFAULT_LOCALES,
      required: false,
    }))
  await addMultiEntry({ type, name, framework, unocss, locales, packageRoot })
}

async function promptName(kind: string, placeholder: string): Promise<string> {
  return textOrExit({
    message: `Enter the ${kind} name (kebab-case)`,
    placeholder,
    validate(value) {
      return /^[a-z][a-z0-9-]*$/.test(value ?? '')
        ? undefined
        : 'Use kebab-case: lowercase letters, digits, and dashes, starting with a letter.'
    },
  })
}

export async function addMultiEntry(options: AddEntryOptions): Promise<void> {
  const { type, name } = options
  validateName(name)
  if (type !== 'node' && type !== 'plugin') throw new Error('Type must be node or plugin.')
  const framework = options.framework ?? 'vanilla'
  if (!['vanilla', 'svelte', 'vue'].includes(framework))
    throw new Error(`Invalid framework: ${framework}`)
  if (options.unocss && framework === 'vanilla')
    throw new Error('UnoCSS requires --framework vue or svelte.')
  if (options.locales?.some(locale => !(locale in SUPPORTED_LOCALES)))
    throw new Error('Unsupported locale. See flowup gen --help for --locales usage.')

  const root = resolve(options.packageRoot ?? process.cwd())
  const packagePath = resolve(root, 'package.json')
  const tsconfigPath = resolve(root, 'tsconfig.json')
  if (!isMultiEntryPackage(root))
    throw new Error('Run this command inside a package created by flowup gen package.')
  const originalPackage = await readFile(packagePath, 'utf8')
  const originalTsconfig = await readFile(tsconfigPath, 'utf8')
  const packageJson = JSON.parse(originalPackage) as Record<string, any>
  const tsconfig = JSON.parse(originalTsconfig) as Record<string, any>
  const scope = packageJson['node-red']?.scope as string | undefined
  if (!scope) throw new Error('Invalid multi-entry package metadata.')
  const group = type === 'node' ? 'nodes' : 'plugins'
  const child = resolve(root, group, name)
  const oppositeGroup = group === 'nodes' ? 'plugins' : 'nodes'
  if (
    !isPathInside(root, child) ||
    existsSync(child) ||
    existsSync(resolve(root, oppositeGroup, name))
  )
    throw new Error(`Entry already exists or path is unsafe: ${group}/${name}`)

  const files = renderEntryFiles(
    type,
    name,
    scope,
    framework,
    !!options.unocss,
    options.locales ?? DEFAULT_LOCALES,
  )
  const nodeRed = packageJson['node-red'] as Record<string, any>
  nodeRed[group] ??= {}
  nodeRed[group][`${scope}-${group}`] = `dist/${scope}-${group}.js`
  packageJson.main = `./dist/${scope}-${group === 'nodes' || Object.keys(nodeRed.nodes ?? {}).length ? 'nodes' : 'plugins'}.js`
  const dependencies = packageJson.devDependencies as Record<string, string>
  const includes = tsconfig.include as string[]
  let typeFile: string | undefined
  let typeContent: string | undefined
  if (framework === 'vue') {
    dependencies['@vitejs/plugin-vue'] = TEMPLATE_DEPENDENCY_VERSIONS['@vitejs/plugin-vue']
    dependencies.vue = TEMPLATE_DEPENDENCY_VERSIONS.vue
    for (const pattern of ['nodes/**/*.vue', 'plugins/**/*.vue'])
      if (!includes.includes(pattern)) includes.push(pattern)
    typeFile = resolve(root, 'types/vue.d.ts')
    typeContent = renderVueTypes()
  } else if (framework === 'svelte') {
    dependencies['@sveltejs/vite-plugin-svelte'] =
      TEMPLATE_DEPENDENCY_VERSIONS['@sveltejs/vite-plugin-svelte']
    dependencies.svelte = TEMPLATE_DEPENDENCY_VERSIONS.svelte
    for (const pattern of ['nodes/**/*.svelte', 'plugins/**/*.svelte'])
      if (!includes.includes(pattern)) includes.push(pattern)
    typeFile = resolve(root, 'types/svelte.d.ts')
    typeContent = renderSvelteTypes()
  }
  if (options.unocss) dependencies.unocss = TEMPLATE_DEPENDENCY_VERSIONS.unocss

  const staging = await createStagingDir(child)
  let committed = false
  let createdTypeFile = false
  try {
    await writeFiles(staging, files)
    await commitStagedDirectory(staging, child, { replaceExisting: false })
    committed = true
    await writeFile(packagePath, json(packageJson), 'utf8')
    await writeFile(tsconfigPath, json(tsconfig), 'utf8')
    if (typeFile && typeContent && !existsSync(typeFile)) {
      await writeFile(typeFile, typeContent, { flag: 'wx' })
      createdTypeFile = true
    }
  } catch (error) {
    await writeFile(packagePath, originalPackage, 'utf8')
    await writeFile(tsconfigPath, originalTsconfig, 'utf8')
    if (createdTypeFile && typeFile) await rm(typeFile, { force: true })
    if (committed) await rm(child, { recursive: true, force: true })
    else await rm(staging, { recursive: true, force: true })
    throw error
  }
  console.info(`Added ${type} ${name} in ${group}/${name}`)
}

function renderEntryFiles(
  type: MultiEntryType,
  name: string,
  scope: string,
  framework: ClientFramework,
  unocss: boolean,
  locales: LocaleCode[],
): FileMap {
  const id = `${scope}-${name}`
  const context = createContext({
    name: id,
    locales,
    flowupVersion: resolveCliVersion(),
    clientFramework: framework,
    unocss,
  })
  const template = type === 'node' ? nodeTemplate(context) : pluginTemplate(context)
  const files: FileMap = {}
  for (const [filename, source] of Object.entries(template)) {
    if (!/^(runtime|client|constant|types|icons|resources|locales)\//.test(filename)) continue
    if (
      filename === 'types/globals.d.ts' ||
      filename === 'types/vue.d.ts' ||
      filename === 'types/svelte.d.ts'
    )
      continue
    let content = source
    if (filename === 'constant/index.ts') {
      const constantName = type === 'node' ? 'NODE_SCOPE' : 'PLUGIN_SCOPE'
      content = content.replace(`${constantName} = "${id}"`, `${constantName} = "${scope}"`)
    }
    if (filename === 'client/editor.html')
      content = content.replaceAll(`data-flowup-scope="${id}"`, `data-flowup-scope="${scope}"`)
    files[filename] = content
  }
  files['icons/README.md'] =
    `Icons for ${id}. Reference a file from the editor as icons/${name}/<file>.\n`
  files['resources/README.md'] =
    `Resources for ${id}. After build they are served from resources/<package-name>/${name}/<file>.\n`
  files['README.md'] =
    `# ${id}\n\n${type === 'node' ? 'Node' : 'Plugin'} entry in the ${scope} package. The runtime, client, constant, types, locales, icons, and resources directories follow the single-entry scaffold. Run flowup build from the package root.\n`
  return files
}
