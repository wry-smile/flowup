import type { AssembleCommandOptions } from './command'
import type { FlowupPackageJson, FlowupPackageRecord, FlowupNodeRedField } from '../../share/flowup-packages'
import { existsSync } from 'node:fs'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { runBuild } from '../build/impl'
import { loadFlowupAssembleConfig } from '../../share/flowup-assemble-config'
import { scanFlowupPackages } from '../../share/flowup-packages'
import { parseCsvList } from '../../share/paths'

export interface AssembleOptions {
  cwd?: string
  config?: string
  output?: string
  name?: string
  version?: string
  description?: string
  author?: string
  license?: string
  packages?: string[]
  clean?: boolean
  skipBuild?: boolean
}

export interface AssembleResult {
  rootDir: string
  outputDir: string
  packages: FlowupPackageRecord[]
  manifest: Record<string, unknown>
  configPath?: string
}

export async function runAssemble(rawOptions: AssembleCommandOptions | AssembleOptions = {}): Promise<AssembleResult> {
  const loadedConfig = await loadFlowupAssembleConfig({
    cwd: rawOptions.cwd,
    config: rawOptions.config,
  })
  const options = normalizeAssembleOptions(rawOptions, loadedConfig?.assemble)
  const scanCwd = resolve(options.cwd ?? loadedConfig?.rootDir ?? process.cwd())
  const scanResult = await scanFlowupPackages({
    cwd: scanCwd,
    packages: options.packages,
  })

  if (!scanResult.packages.length) {
    const scopeLabel = scanResult.monorepo
      ? `workspace root ${scanResult.rootDir}`
      : `directory ${scanResult.rootDir}`
    throw new Error(`No flowup-built Node-RED nodes or plugins found under ${scopeLabel}.`)
  }

  const outputDir = resolveAssembleOutputDir(scanResult.rootDir, scanResult.packages, options.output)
  const outputDirRelative = relative(scanResult.rootDir, outputDir) || '.'

  for (const pkg of scanResult.packages) {
    if (pkg.dir === outputDir || pkg.dir.startsWith(`${outputDir}/`))
      throw new Error(`Output directory ${outputDir} cannot be inside a source package: ${pkg.relPath}`)
  }

  if (options.clean && existsSync(outputDir))
    await rm(outputDir, { recursive: true, force: true })

  await mkdir(outputDir, { recursive: true })

  if (!options.skipBuild) {
    for (const pkg of scanResult.packages)
      await runBuild({ cwd: pkg.dir, mode: 'all' })
  }

  const copiedPackages: Array<FlowupPackageRecord & { targetDirName: string }> = []
  const usedTargetDirs = new Set<string>()

  for (const pkg of scanResult.packages) {
    const distDir = resolve(pkg.dir, 'dist')
    if (!existsSync(distDir))
      throw new Error(`Missing dist directory for ${pkg.relPath}. Run flowup build first or remove --skip-build.`)

    const targetDirName = createUniqueTargetDirName(pkg, usedTargetDirs)
    const targetDir = resolve(outputDir, targetDirName)
    await mkdir(targetDir, { recursive: true })
    await cp(distDir, targetDir, { recursive: true, force: true })
    copiedPackages.push({ ...pkg, targetDirName })
  }

  const manifest = buildAssembleManifest(copiedPackages, {
    name: options.name,
    version: options.version,
    description: options.description,
    author: options.author,
    license: options.license,
  })

  await writeFile(
    join(outputDir, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )

  await writeFile(
    join(outputDir, 'README.md'),
    renderAssembleReadme(copiedPackages, manifest.name as string, outputDirRelative),
    'utf8',
  )

  await writeFile(join(outputDir, '.gitignore'), 'node_modules\n', 'utf8')

  console.log(`Assembled ${copiedPackages.length} package(s) into ${outputDir}`)

  return {
    rootDir: scanResult.rootDir,
    outputDir,
    packages: copiedPackages,
    manifest,
    configPath: loadedConfig?.path,
  }
}

function normalizeAssembleOptions(
  rawOptions: AssembleCommandOptions | AssembleOptions,
  configOptions: AssembleOptions | undefined,
): Required<AssembleOptions> {
  return {
    cwd: rawOptions.cwd ?? configOptions?.cwd ?? process.cwd(),
    config: rawOptions.config ?? configOptions?.config ?? '',
    output: rawOptions.output ?? configOptions?.output ?? '',
    name: rawOptions.name ?? configOptions?.name ?? 'flowup-assemble',
    version: rawOptions.version ?? configOptions?.version ?? '1.0.0',
    description: rawOptions.description ?? configOptions?.description ?? '',
    author: rawOptions.author ?? configOptions?.author ?? '',
    license: rawOptions.license ?? configOptions?.license ?? 'MIT',
    packages: Array.isArray(rawOptions.packages)
      ? rawOptions.packages
      : parseCsvList(rawOptions.packages) ?? configOptions?.packages ?? [],
    clean: rawOptions.clean ?? configOptions?.clean ?? true,
    skipBuild: rawOptions.skipBuild ?? configOptions?.skipBuild ?? false,
  }
}

function resolveAssembleOutputDir(
  rootDir: string,
  packages: FlowupPackageRecord[],
  explicitOutput: string | undefined,
): string {
  if (explicitOutput)
    return resolve(rootDir, explicitOutput)

  const preferred = resolve(rootDir, 'dist/flowup-assemble')
  const collidesWithSourceDist = packages.some((pkg) => {
    const sourceDistDir = resolve(pkg.dir, 'dist')
    return preferred === sourceDistDir || preferred.startsWith(`${sourceDistDir}/`)
  })

  if (!collidesWithSourceDist)
    return preferred

  return resolve(rootDir, '.flowup/flowup-assemble')
}

function createUniqueTargetDirName(
  pkg: FlowupPackageRecord,
  usedTargetDirs: Set<string>,
): string {
  const preferred = sanitizeAssembleDirName(pkg.nodeRed.scope ?? basename(pkg.dir))
  if (!usedTargetDirs.has(preferred)) {
    usedTargetDirs.add(preferred)
    return preferred
  }

  const fallback = sanitizeAssembleDirName(pkg.name)
  if (!usedTargetDirs.has(fallback)) {
    usedTargetDirs.add(fallback)
    return fallback
  }

  let suffix = 2
  while (usedTargetDirs.has(`${fallback}-${suffix}`))
    suffix += 1

  const finalName = `${fallback}-${suffix}`
  usedTargetDirs.add(finalName)
  return finalName
}

function sanitizeAssembleDirName(value: string): string {
  return value
    .replace(/^@/, '')
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}

function buildAssembleManifest(
  packages: Array<FlowupPackageRecord & { targetDirName: string }>,
  options: Pick<Required<AssembleOptions>, 'name' | 'version' | 'description' | 'author' | 'license'>,
): Record<string, unknown> {
  const dependencies: Record<string, string> = {}
  const peerDependencies: Record<string, string> = {}
  const optionalDependencies: Record<string, string> = {}
  const nodeRed: FlowupNodeRedField = {
    nodes: {},
    plugins: {},
  }

  for (const pkg of packages) {
    mergeDependencyMap(dependencies, pkg.packageJson.dependencies, `${pkg.name} dependencies`)
    mergeDependencyMap(peerDependencies, pkg.packageJson.peerDependencies, `${pkg.name} peerDependencies`)
    mergeDependencyMap(optionalDependencies, pkg.packageJson.optionalDependencies, `${pkg.name} optionalDependencies`)

    mergeNodeRedEntries(nodeRed.nodes!, pkg.nodeRed.nodes, pkg.targetDirName, pkg.name, 'node')
    mergeNodeRedEntries(nodeRed.plugins!, pkg.nodeRed.plugins, pkg.targetDirName, pkg.name, 'plugin')
  }

  return stripUndefined({
    name: options.name,
    version: options.version,
    description: options.description || `Assembled ${packages.length} flowup-built Node-RED component package(s).`,
    author: options.author || undefined,
    license: options.license,
    type: 'commonjs',
    keywords: ['Node-RED', 'flowup', 'assemble'],
    dependencies: Object.keys(dependencies).length ? dependencies : undefined,
    peerDependencies: Object.keys(peerDependencies).length ? peerDependencies : undefined,
    optionalDependencies: Object.keys(optionalDependencies).length ? optionalDependencies : undefined,
    'node-red': nodeRed,
  })
}

function mergeDependencyMap(
  target: Record<string, string>,
  source: FlowupPackageJson['dependencies'],
  label: string,
): void {
  if (!source)
    return

  for (const [name, range] of Object.entries(source)) {
    const existing = target[name]
    if (existing && existing !== range)
      throw new Error(`Dependency version conflict for "${name}" in ${label}: "${existing}" vs "${range}"`)

    target[name] = range
  }
}

function mergeNodeRedEntries(
  target: Record<string, string>,
  source: Record<string, string> | undefined,
  targetDirName: string,
  packageName: string,
  kind: 'node' | 'plugin',
): void {
  if (!source)
    return

  for (const [entryName, entryPath] of Object.entries(source)) {
    if (target[entryName])
      throw new Error(`Duplicate ${kind} entry "${entryName}" while bundling package ${packageName}`)

    const fileName = basename(entryPath)
    target[entryName] = `${targetDirName}/${fileName}`
  }
}

function renderAssembleReadme(
  packages: Array<FlowupPackageRecord & { targetDirName: string }>,
  assembleName: string,
  outputDirRelative: string,
): string {
  const lines = packages.map(pkg => `- \`${pkg.name}\` -> \`${pkg.targetDirName}/\``)

  return `# ${assembleName}

Assembled by \`flowup assemble\`.

Output directory: \`${outputDirRelative}\`

Included packages:

${lines.join('\n')}
`
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
