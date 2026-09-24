import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { resolveCliPackageRoot } from '../../share/cli-pkg'
import { multiselectOrExit, selectOrExit } from '../../share/prompts'
import { commitStagedDirectory, createStagingDir, isPathInside } from '../../share/safe-fs'
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

  const templateRoot = getTemplateRoot(framework)
  const available = readdirSync(templateRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[a-z][a-z0-9-]*$/.test(entry.name))
    .map(entry => entry.name)
    .sort()
  const selected = options.names?.length
    ? options.names
    : await multiselectOrExit<string>({
        message: 'Select components to install',
        options: available.map(name => ({ value: name, label: name })),
        required: true,
      })
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
  const resolved = resolveDependencies(selected, templateRoot)
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
    for (const name of added)
      await cp(join(templateRoot, name), join(staging, name), { recursive: true })
    const themePath = join(staging, 'theme.css')
    if (existsSync(themePath)) {
      const existingTheme = await readFile(themePath, 'utf8')
      if (!existingTheme.includes('--fui-surface'))
        throw new Error(`Existing ${join(target, 'theme.css')} is not a Flowup UI component theme.`)
    } else {
      const theme = await readFile(join(templateRoot, 'theme.css'), 'utf8')
      await writeFile(themePath, theme.replaceAll('__FLOWUP_SCOPE__', scope))
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

function getTemplateRoot(framework: string): string {
  const packageRoot = resolveCliPackageRoot()
  if (!packageRoot) throw new Error('Cannot locate the Flowup CLI package.')
  const directory = resolve(packageRoot, 'templates/components', framework)
  if (!existsSync(directory)) throw new Error(`Component templates are missing: ${directory}`)
  return directory
}

function resolveDependencies(selected: string[], root: string): string[] {
  const result = new Set<string>()
  function visit(name: string): void {
    if (result.has(name)) return
    const directory = join(root, name)
    if (!existsSync(directory)) throw new Error(`Missing component dependency: ${name}`)
    result.add(name)
    for (const file of componentSourceFiles(directory)) {
      const source = readFileSync(file, 'utf8')
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
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path)
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
    if (!existsSync(resolve(root, 'client/App.tsx')))
      throw new Error('Component installation requires a SolidJS client.')
    const index = resolve(root, 'client/index.tsx')
    if (!existsSync(index) || !readFileSync(index, 'utf8').includes('virtual:uno.css'))
      throw new Error('The SolidJS client must import virtual:uno.css.')
  }
  if (multi) {
    const hasSolidUnoEntry = ['nodes', 'plugins'].some(group => {
      const groupDir = resolve(root, group)
      if (!existsSync(groupDir)) return false
      return readdirSync(groupDir, { withFileTypes: true }).some(entry => {
        if (!entry.isDirectory()) return false
        const clientDir = resolve(groupDir, entry.name, 'client')
        const index = resolve(clientDir, 'index.tsx')
        return (
          existsSync(resolve(clientDir, 'App.tsx')) &&
          existsSync(index) &&
          readFileSync(index, 'utf8').includes('virtual:uno.css')
        )
      })
    })
    if (!hasSolidUnoEntry)
      throw new Error('Add a SolidJS node or plugin with --unocss before installing components.')
  }
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
