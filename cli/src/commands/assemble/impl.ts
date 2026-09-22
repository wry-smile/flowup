import type { FlowupArtifactManifest } from '../../share/flowup-artifact'
import type { FlowupNodeRedField, FlowupPackageJson, FlowupPackageRecord } from '../../share/flowup-packages'
import type { AssembleCommandOptions } from './command'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { readFlowupArtifact } from '../../share/flowup-artifact'
import { loadFlowupAssembleConfig } from '../../share/flowup-assemble-config'
import { scanFlowupPackages } from '../../share/flowup-packages'
import { parseCsvList } from '../../share/paths'
import { assertSafeAssembleOutput, commitStagedDirectory, createStagingDir, pathsOverlap } from '../../share/safe-fs'
import { renderMitLicense } from '../../templates/license'
import { runBuild } from '../build/impl'

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

interface PreparedPackage extends FlowupPackageRecord {
  artifact: FlowupArtifactManifest
  distDir: string
  builtPackageJson: FlowupPackageJson
  builtNodeRed: FlowupNodeRedField
  targetDirName: string
}

export async function runAssemble(rawOptions: AssembleCommandOptions | AssembleOptions = {}): Promise<AssembleResult> {
  const loadedConfig = await loadFlowupAssembleConfig({
    cwd: rawOptions.cwd,
    config: rawOptions.config,
  })
  const options = normalizeAssembleOptions(rawOptions, loadedConfig?.assemble, loadedConfig?.rootDir)
  const scanCwd = resolve(options.cwd)
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
  await assertSafeAssembleOutput(outputDir, scanResult.packages.map(pkg => pkg.dir))

  if (!options.skipBuild) {
    for (const pkg of scanResult.packages)
      await runBuild({ cwd: pkg.dir, mode: 'all' })
  }

  const preparedPackages: PreparedPackage[] = []
  const usedTargetDirs = new Set<string>()

  for (const pkg of scanResult.packages) {
    const distDir = resolve(pkg.dir, 'dist')
    if (!existsSync(distDir))
      throw new Error(`Missing dist directory for ${pkg.relPath}. Run flowup build first or remove --skip-build.`)

    const { manifest: artifact, packageJson: builtPackageJson } = await readFlowupArtifact(distDir)
    const builtNodeRed = builtPackageJson['node-red']
    if (!builtNodeRed)
      throw new Error(`Missing node-red metadata in ${join(distDir, 'package.json')}.`)

    const targetDirName = createUniqueTargetDirName(pkg, usedTargetDirs)
    preparedPackages.push({
      ...pkg,
      artifact,
      distDir,
      builtPackageJson,
      builtNodeRed,
      targetDirName,
    })
  }

  const manifest = buildAssembleManifest(preparedPackages, {
    name: options.name,
    version: options.version,
    description: options.description,
    author: options.author,
    license: options.license,
  })
  const stagingDir = await createStagingDir(outputDir)

  try {
    if (!options.clean && existsSync(outputDir))
      await cp(outputDir, stagingDir, { recursive: true, force: true })

    for (const pkg of preparedPackages)
      await copyPreparedPackage(pkg, stagingDir, options.name)

    await writeFile(
      join(stagingDir, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    )

    await writeFile(
      join(stagingDir, 'README.md'),
      renderAssembleReadme(preparedPackages, manifest.name as string, outputDirRelative),
      'utf8',
    )

    await writeFile(join(stagingDir, '.gitignore'), 'node_modules\n', 'utf8')
    await writeFile(join(stagingDir, '.npmignore'), '.flowup-*\n', 'utf8')
    const licensePath = join(stagingDir, 'LICENSE')
    if (options.license === 'MIT')
      await writeFile(licensePath, renderMitLicense(), 'utf8')
    else
      await rm(licensePath, { force: true })
    await commitStagedDirectory(stagingDir, outputDir)
  }
  catch (error) {
    await rm(stagingDir, { recursive: true, force: true })
    throw error
  }

  console.log(`Assembled ${preparedPackages.length} package(s) into ${outputDir}`)

  return {
    rootDir: scanResult.rootDir,
    outputDir,
    packages: preparedPackages,
    manifest,
    configPath: loadedConfig?.path,
  }
}

function normalizeAssembleOptions(
  rawOptions: AssembleCommandOptions | AssembleOptions,
  configOptions: AssembleOptions | undefined,
  configRootDir: string | undefined,
): Required<AssembleOptions> {
  return {
    cwd: rawOptions.cwd ?? configOptions?.cwd ?? configRootDir ?? process.cwd(),
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
  const collidesWithSourceDist = packages.some(pkg => pathsOverlap(preferred, resolve(pkg.dir, 'dist')))

  if (!collidesWithSourceDist)
    return preferred

  return resolve(dirname(rootDir), `${basename(rootDir)}-flowup-assemble`)
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
    .replace(/[^\w.-]/g, '-')
}

function buildAssembleManifest(
  packages: PreparedPackage[],
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
    mergeDependencyMap(dependencies, pkg.builtPackageJson.dependencies, `${pkg.name} dependencies`)
    mergeDependencyMap(peerDependencies, pkg.builtPackageJson.peerDependencies, `${pkg.name} peerDependencies`)
    mergeDependencyMap(optionalDependencies, pkg.builtPackageJson.optionalDependencies, `${pkg.name} optionalDependencies`)

    mergeNodeRedEntries(nodeRed.nodes!, pkg.builtNodeRed.nodes, pkg.targetDirName, pkg.name, 'node')
    mergeNodeRedEntries(nodeRed.plugins!, pkg.builtNodeRed.plugins, pkg.targetDirName, pkg.name, 'plugin')
    mergeNodeRedVersion(nodeRed, pkg.builtNodeRed.version, pkg.name)
    mergeNodeRedDependencies(nodeRed, pkg.builtNodeRed.dependencies)
  }

  return stripUndefined({
    'name': options.name,
    'version': options.version,
    'description': options.description || `Assembled ${packages.length} flowup-built Node-RED component package(s).`,
    'author': options.author || undefined,
    'license': options.license,
    'type': 'commonjs',
    'keywords': ['node-red', 'flowup', 'assemble'],
    'dependencies': Object.keys(dependencies).length ? dependencies : undefined,
    'peerDependencies': Object.keys(peerDependencies).length ? peerDependencies : undefined,
    'optionalDependencies': Object.keys(optionalDependencies).length ? optionalDependencies : undefined,
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

    const normalizedEntryPath = entryPath.replaceAll('\\', '/').replace(/^\.\//, '')
    target[entryName] = `${targetDirName}/${normalizedEntryPath}`
  }
}

function mergeNodeRedVersion(
  target: FlowupNodeRedField,
  version: string | undefined,
  packageName: string,
): void {
  if (!version)
    return
  if (target.version && target.version !== version) {
    throw new Error(
      `Node-RED version conflict in ${packageName}: "${target.version}" vs "${version}"`,
    )
  }
  target.version = version
}

function mergeNodeRedDependencies(target: FlowupNodeRedField, dependencies: string[] | undefined): void {
  if (!dependencies?.length)
    return
  target.dependencies = [...new Set([...(target.dependencies ?? []), ...dependencies])].sort()
}

async function copyPreparedPackage(
  pkg: PreparedPackage,
  stagingDir: string,
  assembleName: string,
): Promise<void> {
  const targetDir = resolve(stagingDir, pkg.targetDirName)
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })
  await cp(pkg.distDir, targetDir, { recursive: true, force: true })

  const resourcesDir = resolve(pkg.distDir, 'resources')
  if (existsSync(resourcesDir)) {
    const aggregateResourcesDir = resolve(stagingDir, 'resources', pkg.targetDirName)
    await rm(aggregateResourcesDir, { recursive: true, force: true })
    await mkdir(aggregateResourcesDir, { recursive: true })
    await cp(resourcesDir, aggregateResourcesDir, { recursive: true, force: true })
    await rewriteResourceReferences(targetDir, pkg.builtPackageJson.name ?? pkg.name, assembleName, pkg.targetDirName)
  }
}

async function rewriteResourceReferences(
  rootDir: string,
  sourcePackageName: string,
  assembleName: string,
  targetDirName: string,
): Promise<void> {
  const files = await listTextAssets(rootDir)
  const sourceBase = `resources/${sourcePackageName}/`
  const aggregateBase = `resources/${assembleName}/${targetDirName}/`

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8')
    const rewritten = source
      .replaceAll(`/${sourceBase}`, `/${aggregateBase}`)
      .replaceAll(sourceBase, aggregateBase)
      .replaceAll('__FLOWUP_RESOURCE_BASE__/', aggregateBase)

    if (rewritten !== source)
      await writeFile(filePath, rewritten, 'utf8')
  }
}

async function listTextAssets(rootDir: string): Promise<string[]> {
  const output: string[] = []
  for (const entry of await readdir(rootDir, { withFileTypes: true })) {
    const absolutePath = resolve(rootDir, entry.name)
    if (entry.isSymbolicLink())
      continue
    if (entry.isDirectory()) {
      output.push(...await listTextAssets(absolutePath))
      continue
    }
    if (/\.(?:c?js|css|html|json)$/i.test(entry.name))
      output.push(absolutePath)
  }
  return output
}

function renderAssembleReadme(
  packages: PreparedPackage[],
  assembleName: string,
  outputDirRelative: string,
): string {
  const lines = packages.map(pkg => `- \`${pkg.name}\` -> \`${pkg.targetDirName}/\``)

  return `# ${assembleName}

Assembled by \`flowup assemble\`.

Output directory: \`${outputDirRelative}\`

Included packages:

${lines.join('\n')}

## Install

Install this directory or its npm tarball into the Node-RED user directory:

\`\`\`bash
npm pack
npm install ./<generated-tarball>.tgz
\`\`\`

Node-RED entries, editor assets, locales, icons, and namespaced resources are
already mapped by the generated \`package.json\`. Do not move component files
out of their generated directories.
`
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
