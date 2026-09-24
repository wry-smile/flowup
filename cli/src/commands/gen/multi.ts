import type { ClientFramework, FileMap } from './context'
import type { LocaleCode } from './locale'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { resolveCliVersion } from '../../share/cli-pkg'
import { isInMonorepo } from '../../share/monorepo'
import { confirmOrExit, multiselectOrExit, selectOrExit } from '../../share/prompts'
import { commitStagedDirectory, createStagingDir, isPathInside } from '../../share/safe-fs'
import { TEMPLATE_DEPENDENCY_VERSIONS } from '../../templates/dependency-versions'
import { renderSvelteTypes, renderVueTypes } from '../../templates/framework-assets'
import { nodeTemplate } from '../../templates/node'
import { pluginTemplate } from '../../templates/plugin'
import { createContext } from './context'
import { showGenerationGuide } from './feedback'
import { collectClientOptions, promptEntryName } from './collect'
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

interface GeneratedEntry {
  framework: ClientFramework
  unocss: boolean
}

type GeneratedEntries = Record<string, GeneratedEntry>

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

function renderMultiPackageConfig(scope: string, entries: GeneratedEntries = {}): string {
  const list = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))
  const frameworks = new Set(list.map(([, entry]) => entry.framework))
  const imports = [
    `import { defineConfig${list.some(([, entry]) => entry.unocss) ? ', presetFlowupWind4' : ''} } from '@wry-smile/flowup'`,
    "import { fileURLToPath } from 'node:url'",
    ...(list.some(([, entry]) => entry.unocss) ? ["import UnoCSS from 'unocss/vite'"] : []),
    ...(frameworks.has('preact') ? ["import { preact } from '@preact/preset-vite'"] : []),
    ...(frameworks.has('vue') ? ["import vue from '@vitejs/plugin-vue'"] : []),
    ...(frameworks.has('svelte') ? ["import { svelte } from '@sveltejs/vite-plugin-svelte'"] : []),
    ...(frameworks.has('solid') ? ["import solid from 'vite-plugin-solid'"] : []),
  ]
  const solidEntries = list
    .filter(([, entry]) => entry.framework === 'solid')
    .map(([path]) => `        '**/${path}/client/**/*.{jsx,tsx}',`)
  const preactEntries = list
    .filter(([, entry]) => entry.framework === 'preact')
    .map(([path]) => `        '**/${path}/client/**/*.{jsx,tsx}',`)
  const plugins = [
    ...(list.some(([, entry]) => entry.unocss)
      ? ['      UnoCSS({ presets: [presetFlowupWind4({ scope })] }),']
      : []),
    ...(preactEntries.length
      ? [`      preact({ include: [\n${preactEntries.join('\n')}\n      ] }),`]
      : []),
    ...(frameworks.has('vue') ? ['      vue(),'] : []),
    ...(frameworks.has('svelte') ? ['      svelte(),'] : []),
    ...(solidEntries.length
      ? [`      solid({ include: [\n${solidEntries.join('\n')}\n      ] }),`]
      : []),
  ]
  const alias = `{
      '@': fileURLToPath(new URL('.', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@client-shared': fileURLToPath(new URL('./client-shared', import.meta.url)),
      '@runtime-shared': fileURLToPath(new URL('./runtime-shared', import.meta.url)),
    }`
  return `${imports.join('\n')}

const scope = '${scope}'
const sharedAlias = ${alias}

export default defineConfig({
  scope,
  runtime: { config: { resolve: { alias: sharedAlias } } },
  client: {
${plugins.length ? `    plugins: [\n${plugins.join('\n')}\n    ],\n` : ''}    config: { resolve: { alias: sharedAlias } },
  },
})
`
}

function renderLegacyMultiPackageConfig(scope: string): string {
  return `import { defineConfig } from '@wry-smile/flowup'\n\nexport default defineConfig({\n  scope: '${scope}',\n})\n`
}

function sameGeneratedConfig(actual: string, expected: string): boolean {
  return actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '')
}

export async function generateMultiPackage(name: string): Promise<string> {
  validateName(name)
  const root = resolve(process.cwd(), name)
  if (!isPathInside(process.cwd(), root)) throw new Error(`Unsafe target directory: ${root}`)
  if (existsSync(root)) throw new Error(`Package "${name}" already exists. Choose another name.`)

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
    scripts: {
      build: 'flowup build',
      dev: 'flowup dev',
      typecheck: 'tsc --noEmit -p tsconfig.json',
    },
    'node-red': { scope: name, nodes: {}, plugins: {} },
    flowup: { entries: {} as GeneratedEntries },
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
        jsx: 'preserve',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        strict: true,
        isolatedModules: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['vite/client', 'node', 'jquery'],
        allowArbitraryExtensions: true,
        paths: {
          '@/*': ['./*'],
          '@shared/*': ['./shared/*'],
          '@client-shared/*': ['./client-shared/*'],
          '@runtime-shared/*': ['./runtime-shared/*'],
        },
      },
      include: [
        'flowup.config.ts',
        'nodes/**/*.ts',
        'nodes/**/*.tsx',
        'plugins/**/*.ts',
        'plugins/**/*.tsx',
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
  p.log.success(pc.green(`Created ${name}`))
  showGenerationGuide(
    'Package ready',
    [`${name}/`, 'Add nodes and plugins when you are ready'],
    [
      `cd ${name}`,
      'flowup gen add node example --framework vue --unocss',
      'pnpm install && pnpm dev',
    ],
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
  const packageName = name ?? (await promptEntryName('package', 'my-package', process.cwd()))
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
  p.outro(pc.green(`Ready: cd ${packageName} && pnpm install && pnpm dev`))
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
  const name =
    options.name ??
    (await promptEntryName(type, type === 'node' ? 'my-node' : 'my-plugin', [
      resolve(packageRoot, 'nodes'),
      resolve(packageRoot, 'plugins'),
    ]))
  const { framework, unocss } = await collectClientOptions(options)
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

export async function addMultiEntry(options: AddEntryOptions): Promise<void> {
  const { type, name } = options
  validateName(name)
  if (type !== 'node' && type !== 'plugin') throw new Error('Type must be node or plugin.')
  const framework = options.framework ?? 'vanilla'
  if (!['vanilla', 'svelte', 'vue', 'preact', 'solid'].includes(framework))
    throw new Error(`Invalid framework: ${framework}`)
  if (options.unocss && framework === 'vanilla')
    throw new Error('UnoCSS requires a framework entry.')
  if (options.locales?.some(locale => !(locale in SUPPORTED_LOCALES)))
    throw new Error('Unsupported locale. See flowup gen --help for --locales usage.')

  const root = resolve(options.packageRoot ?? process.cwd())
  const packagePath = resolve(root, 'package.json')
  const tsconfigPath = resolve(root, 'tsconfig.json')
  const configPath = resolve(root, 'flowup.config.ts')
  if (!isMultiEntryPackage(root))
    throw new Error('Run this command inside a package created by flowup gen package.')
  const originalPackage = await readFile(packagePath, 'utf8')
  const originalTsconfig = await readFile(tsconfigPath, 'utf8')
  const originalConfig = await readFile(configPath, 'utf8')
  const packageJson = JSON.parse(originalPackage) as Record<string, any>
  const tsconfig = JSON.parse(originalTsconfig) as Record<string, any>
  const scope = packageJson['node-red']?.scope as string | undefined
  if (!scope) throw new Error('Invalid multi-entry package metadata.')
  const group = type === 'node' ? 'nodes' : 'plugins'
  const previousEntries = (packageJson.flowup?.entries ?? {}) as GeneratedEntries
  const mayUpdateConfig =
    sameGeneratedConfig(originalConfig, renderMultiPackageConfig(scope, previousEntries)) ||
    (Object.keys(previousEntries).length === 0 &&
      sameGeneratedConfig(originalConfig, renderLegacyMultiPackageConfig(scope)))
  const child = resolve(root, group, name)
  const oppositeGroup = group === 'nodes' ? 'plugins' : 'nodes'
  if (
    !isPathInside(root, child) ||
    existsSync(child) ||
    existsSync(resolve(root, oppositeGroup, name))
  )
    throw new Error(
      `Entry "${name}" already exists in this package, or its path is unsafe. Choose another name.`,
    )

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
  const nextEntries: GeneratedEntries = {
    ...previousEntries,
    [`${group}/${name}`]: { framework, unocss: !!options.unocss },
  }
  packageJson.flowup = { ...packageJson.flowup, entries: nextEntries }
  const includes = tsconfig.include as string[]
  if (framework === 'preact' || framework === 'solid') {
    const entryPath = `${group}/${name}`
    const excluded = `${entryPath}/client/**/*.tsx`
    const excludes = (tsconfig.exclude ??= []) as string[]
    if (!excludes.includes(excluded)) excludes.push(excluded)
    packageJson.scripts.typecheck ??= 'tsc --noEmit -p tsconfig.json'
    packageJson.scripts.typecheck += ` && tsc --noEmit -p ${entryPath}/tsconfig.json`
  }
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
  } else if (framework === 'preact') {
    dependencies['@preact/preset-vite'] = TEMPLATE_DEPENDENCY_VERSIONS['@preact/preset-vite']
    dependencies.preact = TEMPLATE_DEPENDENCY_VERSIONS.preact
  } else if (framework === 'solid') {
    dependencies['solid-js'] = TEMPLATE_DEPENDENCY_VERSIONS['solid-js']
    dependencies['vite-plugin-solid'] = TEMPLATE_DEPENDENCY_VERSIONS['vite-plugin-solid']
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
    if (mayUpdateConfig) await writeFile(configPath, renderMultiPackageConfig(scope, nextEntries))
    if (typeFile && typeContent && !existsSync(typeFile)) {
      await writeFile(typeFile, typeContent, { flag: 'wx' })
      createdTypeFile = true
    }
  } catch (error) {
    await writeFile(packagePath, originalPackage, 'utf8')
    await writeFile(tsconfigPath, originalTsconfig, 'utf8')
    if (mayUpdateConfig) await writeFile(configPath, originalConfig, 'utf8')
    if (createdTypeFile && typeFile) await rm(typeFile, { force: true })
    if (committed) await rm(child, { recursive: true, force: true })
    else await rm(staging, { recursive: true, force: true })
    throw error
  }
  p.log.success(pc.green(`Added ${type} ${name}`))
  showGenerationGuide(
    `${type === 'node' ? 'Node' : 'Plugin'} ready`,
    [
      `${group}/${name}`,
      `flowup.config.ts ${mayUpdateConfig ? 'updated' : 'kept (custom configuration)'}`,
    ],
    ['pnpm install', 'pnpm typecheck', 'pnpm dev'],
  )
  if (!mayUpdateConfig)
    p.note(renderMultiPackageConfig(scope, nextEntries).trim(), 'Suggested generated config')
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
  if (framework === 'preact' || framework === 'solid') {
    files['tsconfig.json'] = json({
      extends: '../../tsconfig.json',
      compilerOptions: {
        jsx: 'preserve',
        jsxImportSource: framework === 'preact' ? 'preact' : 'solid-js',
      },
      exclude: [],
      include: [
        'client/**/*.ts',
        'client/**/*.tsx',
        'constant/**/*.ts',
        'types/**/*.ts',
        '../../types/globals.d.ts',
        '../../client-shared/**/*.ts',
        '../../shared/**/*.ts',
      ],
    })
  }
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
    if (filename === 'client/editor.html') {
      content = content.replaceAll(`data-flowup-scope="${id}"`, `data-flowup-scope="${scope}"`)
      content = content.replaceAll(
        `flowup-${id}/${id}:`,
        `flowup-${scope}/${scope}-${groupFor(type)}:`,
      )
    }
    if (filename === 'client/i18n.ts')
      content = content.replace(`flowup-${id}/${id}`, `flowup-${scope}/${scope}-${groupFor(type)}`)
    files[filename] = content
  }
  files['icons/README.md'] =
    `Icons for ${id}. A source file named icon.svg is emitted as dist/icons/${name}-icon.svg. Set the Node-RED client icon to '${name}-icon.svg' (the filename only).\n`
  files['resources/README.md'] =
    `Resources for ${id}. After build they are served from resources/<package-name>/${name}/<file>.\n`
  files['README.md'] =
    `# ${id}\n\n${type === 'node' ? 'Node' : 'Plugin'} entry in the ${scope} package. The runtime, client, constant, types, locales, icons, and resources directories follow the single-entry scaffold. Run flowup build from the package root.\n`
  return files
}

function groupFor(type: MultiEntryType): 'nodes' | 'plugins' {
  return type === 'node' ? 'nodes' : 'plugins'
}
