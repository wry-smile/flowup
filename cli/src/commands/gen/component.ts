import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { multiselectOrExit, selectOrExit } from '../../share/prompts'
import { commitStagedDirectory, createStagingDir, isPathInside } from '../../share/safe-fs'
import { renderEta } from '../../templates/renderers/eta'
import {
  solidComponentNames,
  solidComponentTemplates,
} from '../../templates/renderers/component-assets'
import { isMultiEntryPackage } from './multi'
import { showGenerationGuide } from './feedback'

export interface ComponentOptions {
  framework?: string
  names?: string[]
  packageRoot?: string
}

const COMPONENT_FRAMEWORK = 'solid'
const COMPONENT_IMPORT = "import './theme.css'"
const SHARED_COMPONENT_INCLUDE = "'**/components/**/*.{jsx,tsx}',"
const ALL_COMPONENTS = '__all_components__'

export async function runComponentGenerator(options: ComponentOptions = {}): Promise<void> {
  const framework =
    options.framework ??
    (await selectOrExit<string>({
      message: 'Select the component framework',
      options: [{ value: COMPONENT_FRAMEWORK, label: 'SolidJS' }],
      initialValue: COMPONENT_FRAMEWORK,
    }))
  if (framework !== COMPONENT_FRAMEWORK)
    throw new Error(`No installable components for ${framework}. SolidJS is currently supported.`)

  const available = solidComponentNames
  const selection = options.names?.length
    ? options.names
    : await multiselectOrExit<string>({
        message: 'Select components to install',
        options: [
          { value: ALL_COMPONENTS, label: 'Install all components' },
          ...available.map(name => ({ value: name, label: name })),
        ],
        required: true,
      })
  const selected =
    selection.includes(ALL_COMPONENTS) || selection.includes('all') ? available : selection
  for (const name of selected)
    if (!available.includes(name)) throw new Error(`Unknown SolidJS component: ${name}`)

  const root = resolve(options.packageRoot ?? process.cwd())
  const packagePath = resolve(root, 'package.json')
  const configPath = resolve(root, 'flowup.config.ts')
  if (!existsSync(packagePath) || !existsSync(configPath))
    throw new Error('Run flowup gen component from a Flowup package root.')
  assertNoSymlinks(packagePath)
  assertNoSymlinks(configPath)
  const multi = isMultiEntryPackage(root)
  const packageSource = await readFile(packagePath, 'utf8')
  const packageJson = JSON.parse(packageSource) as Record<string, any>
  const scope = packageJson['node-red']?.scope as string | undefined
  if (!scope || !/^[a-z][a-z0-9-]*$/.test(scope))
    throw new Error('The package needs a valid node-red.scope before installing components.')
  assertSolidUnoPackage(root, packageJson, multi)

  const target = resolve(root, multi ? 'components' : 'client/components')
  if (!isPathInside(root, target)) throw new Error(`Unsafe component directory: ${target}`)
  if (existsSync(target)) assertNoSymlinks(target)
  const existing = existsSync(target)
    ? readdirSync(target, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    : []
  const resolved = resolveDependencies(selected)
  const added = resolved.filter(name => !existing.includes(name))
  const configSource = await readFile(configPath, 'utf8')
  const nextConfig = prepareConfig(configSource, multi)
  const tsconfigPath = resolve(root, multi ? 'tsconfig.json' : 'tsconfig.app.json')
  assertNoSymlinks(tsconfigPath)
  const tsconfigSource = await readFile(tsconfigPath, 'utf8')
  const tsconfig = JSON.parse(tsconfigSource) as Record<string, any>
  tsconfig.compilerOptions ??= {}
  tsconfig.compilerOptions.paths ??= {}
  tsconfig.compilerOptions.paths['@ui'] = [
    multi ? './components/index.ts' : './client/components/index.ts',
  ]
  tsconfig.compilerOptions.paths['@ui/*'] = [multi ? './components/*' : './client/components/*']
  if (multi) {
    const excludes = (tsconfig.exclude ??= []) as string[]
    if (!excludes.includes('components/**/*')) excludes.push('components/**/*')
  }
  const nextTsconfig = `${JSON.stringify(tsconfig, null, 2)}\n`

  if (multi) {
    packageJson.scripts ??= {}
    const typecheck =
      (packageJson.scripts.typecheck as string | undefined) ?? 'tsc --noEmit -p tsconfig.json'
    if (!typecheck.includes('components/tsconfig.json'))
      packageJson.scripts.typecheck = `${typecheck} && tsc --noEmit -p components/tsconfig.json`
  }
  const nextPackage = `${JSON.stringify(packageJson, null, 2)}\n`
  const staging = await createStagingDir(target)
  try {
    if (existsSync(target)) await cp(target, staging, { recursive: true })
    for (const name of added) {
      const componentFiles = Object.entries(solidComponentTemplates).filter(([path]) =>
        path.startsWith(`${name}/`),
      )
      for (const [path, template] of componentFiles) {
        const targetPath = join(staging, path)
        await mkdir(dirname(targetPath), { recursive: true })
        await writeFile(targetPath, renderEta(template, { scope }))
      }
    }
    const themePath = join(staging, 'theme.css')
    if (existsSync(themePath)) {
      const existingTheme = await readFile(themePath, 'utf8')
      if (!existingTheme.includes('--fui-surface'))
        throw new Error(`Existing ${join(target, 'theme.css')} is not a Flowup UI component theme.`)
    } else {
      const theme = solidComponentTemplates['theme.css']
      if (!theme) throw new Error('The SolidJS component theme template is missing.')
      await writeFile(themePath, renderEta(theme, { scope }))
    }
    const indexPath = join(staging, 'index.ts')
    let index = existsSync(indexPath) ? await readFile(indexPath, 'utf8') : ''
    if (!index.includes(COMPONENT_IMPORT)) index = `${COMPONENT_IMPORT}\n${index}`
    for (const name of [...new Set([...existing, ...added])]
      .filter(name => available.includes(name))
      .sort())
      if (!index.includes(`export * from './${name}'`)) index += `export * from './${name}'\n`
    await writeFile(indexPath, index)
    if (multi && !existsSync(join(staging, 'tsconfig.json')))
      await writeFile(
        join(staging, 'tsconfig.json'),
        `${JSON.stringify(
          {
            extends: '../tsconfig.json',
            compilerOptions: { jsx: 'preserve', jsxImportSource: 'solid-js' },
            include: ['**/*.ts', '**/*.tsx', '../types/globals.d.ts'],
            exclude: [],
          },
          null,
          2,
        )}\n`,
      )

    try {
      if (nextConfig !== configSource) await writeFile(configPath, nextConfig)
      if (nextTsconfig !== tsconfigSource) await writeFile(tsconfigPath, nextTsconfig)
      if (nextPackage !== packageSource) await writeFile(packagePath, nextPackage)
      await commitStagedDirectory(staging, target)
    } catch (error) {
      await writeFile(configPath, configSource)
      await writeFile(tsconfigPath, tsconfigSource)
      await writeFile(packagePath, packageSource)
      throw error
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }

  const location = multi ? 'components/' : 'client/components/'
  const description = added.length
    ? `Installed ${added.join(', ')}`
    : `Already installed: ${resolved.join(', ')}`
  showGenerationGuide(
    pc.green('SolidJS components ready'),
    [description, `Location: ${location}`, 'Import from @ui'],
    multi
      ? ['pnpm typecheck', 'pnpm build']
      : ['pnpm exec tsc --noEmit -p tsconfig.app.json', 'pnpm build'],
  )
}

function resolveDependencies(selected: string[]): string[] {
  const result = new Set<string>()
  function visit(name: string): void {
    if (result.has(name)) return
    const files = Object.entries(solidComponentTemplates).filter(([path]) =>
      path.startsWith(`${name}/`),
    )
    if (!files.length) throw new Error(`Missing component dependency: ${name}`)
    result.add(name)
    for (const [, source] of files) {
      for (const match of source.matchAll(
        /from\s+['"]\.\.\/\.\.\/([a-z][a-z0-9-]*)(?:\/[^'"]*)?['"]/g,
      ))
        visit(match[1])
    }
  }
  for (const name of selected) visit(name)
  return [...result].sort()
}

function componentSourceFiles(directory: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...componentSourceFiles(path))
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(path)
  }
  return files
}

function assertNoSymlinks(path: string): void {
  const stats = lstatSync(path)
  if (stats.isSymbolicLink()) throw new Error(`Symlink is not supported here: ${path}`)
  if (!stats.isDirectory()) return
  for (const entry of readdirSync(path)) assertNoSymlinks(join(path, entry))
}

function assertSolidUnoPackage(
  root: string,
  packageJson: Record<string, any>,
  multi: boolean,
): void {
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
  if (!dependencies['solid-js'] || !dependencies.unocss)
    throw new Error('Generate a SolidJS entry with --unocss and install its dependencies first.')
  if (!multi) {
    if (!hasSolidUnoClient(resolve(root, 'client')))
      throw new Error('The package must contain a SolidJS client configured with UnoCSS.')
  }
  if (multi) {
    const hasSolidUnoEntry = ['nodes', 'plugins'].some(group => {
      const groupDir = resolve(root, group)
      if (!existsSync(groupDir)) return false
      return readdirSync(groupDir, { withFileTypes: true }).some(entry => {
        if (!entry.isDirectory()) return false
        return hasSolidUnoClient(resolve(groupDir, entry.name, 'client'))
      })
    })
    if (!hasSolidUnoEntry)
      throw new Error('The package must contain a SolidJS node or plugin configured with UnoCSS.')
  }
}

function hasSolidUnoClient(clientDir: string): boolean {
  if (!existsSync(clientDir)) return false
  const sourceFiles = componentSourceFiles(clientDir).filter(file =>
    /\.(?:[jt]sx?|jsx?)$/.test(file),
  )
  if (!sourceFiles.length) return false
  const sources = sourceFiles.map(file => readFileSync(file, 'utf8'))
  const isSolidClient =
    sources.some(source => /from\s+['"]solid-js(?:\/[^'"]*)?['"]/.test(source)) ||
    (existsSync(resolve(clientDir, 'tsconfig.json')) &&
      /jsxImportSource\s*:\s*['"]solid-js['"]/.test(
        readFileSync(resolve(clientDir, 'tsconfig.json'), 'utf8'),
      ))
  const hasUnoImport = sources.some(source =>
    /(?:virtual:uno\.css|flowup:unocss|flowup:uno\.css)/.test(source),
  )
  return isSolidClient && hasUnoImport
}

function prepareConfig(source: string, multi: boolean): string {
  let config = source
  if (!config.includes("'@ui':")) {
    const legacySingleAlias =
      "const sharedAlias = { '@': fileURLToPath(new URL('.', import.meta.url)) }"
    if (!multi && config.includes(legacySingleAlias)) {
      config = config.replace(
        legacySingleAlias,
        "const sharedAlias = {\n  '@': fileURLToPath(new URL('.', import.meta.url)),\n  '@ui': fileURLToPath(new URL('./client/components', import.meta.url)),\n}",
      )
    } else {
      const aliasAnchor = /const sharedAlias\s*=\s*\{/
      if (!aliasAnchor.test(config))
        throw new Error('Add an @ui alias to the custom flowup.config.ts.')
      const target = multi ? './components' : './client/components'
      config = config.replace(
        aliasAnchor,
        `const sharedAlias = {\n  '@ui': fileURLToPath(new URL('${target}', import.meta.url)),`,
      )
    }
  }
  if (multi && !config.includes(SHARED_COMPONENT_INCLUDE)) {
    const includeAnchor = /solid\(\{\s*include:\s*\[/
    if (!includeAnchor.test(config))
      throw new Error(
        'Add components/**/*.tsx to the Solid plugin include list in flowup.config.ts.',
      )
    config = config.replace(
      includeAnchor,
      match => `${match}\n          ${SHARED_COMPONENT_INCLUDE}`,
    )
  }
  return config
}
