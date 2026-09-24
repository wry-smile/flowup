import type { Dirent } from 'node:fs'
import type { FlowupNodeRedField, FlowupPackageJson } from './flowup-packages'
import { existsSync } from 'node:fs'
import { lstat, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path'

export const FLOWUP_ARTIFACT_FILE = 'flowup.manifest.json'
export const FLOWUP_ARTIFACT_FORMAT_VERSION = 1

export interface FlowupArtifactManifest {
  formatVersion: 1
  flowupVersion: string
  package: {
    name: string
    version: string
  }
  nodeRed: {
    nodes?: Record<string, string>
    plugins?: Record<string, string>
  }
  assets: {
    icons: string[]
    locales: string[]
    resources: string[]
  }
  runtime: {
    format: 'commonjs'
    externalDependencies: string[]
  }
}

export interface ReadFlowupArtifactResult {
  manifest: FlowupArtifactManifest
  packageJson: FlowupPackageJson
}

export async function writeFlowupArtifactManifest(
  distDir: string,
  flowupVersion: string,
): Promise<FlowupArtifactManifest> {
  const packageJson = await readDistPackageJson(distDir)
  const nodeRed = requireNodeRedEntries(packageJson, join(distDir, 'package.json'))
  await validateNodeRedEntries(distDir, nodeRed)

  const files = await walkRegularFiles(distDir)
  const manifest: FlowupArtifactManifest = {
    formatVersion: FLOWUP_ARTIFACT_FORMAT_VERSION,
    flowupVersion,
    package: {
      name: requireNonEmptyString(packageJson.name, 'dist package name'),
      version: requireNonEmptyString(packageJson.version, 'dist package version'),
    },
    nodeRed: {
      nodes: normalizeEntryMap(nodeRed.nodes),
      plugins: normalizeEntryMap(nodeRed.plugins),
    },
    assets: {
      icons: files.filter(file => file.startsWith('icons/')),
      locales: files.filter(file => file.startsWith('locales/')),
      resources: files.filter(file => file.startsWith('resources/')),
    },
    runtime: {
      format: 'commonjs',
      externalDependencies: [],
    },
  }

  const finalizedManifest = stripEmptyEntryMaps(manifest)
  await writeFile(
    join(distDir, FLOWUP_ARTIFACT_FILE),
    `${JSON.stringify(finalizedManifest, null, 2)}\n`,
    'utf8',
  )
  return finalizedManifest
}

export async function readFlowupArtifact(distDir: string): Promise<ReadFlowupArtifactResult> {
  const packageJson = await readDistPackageJson(distDir)
  const manifestPath = join(distDir, FLOWUP_ARTIFACT_FILE)

  if (!existsSync(manifestPath)) {
    const nodeRed = requireNodeRedEntries(packageJson, join(distDir, 'package.json'))
    await validateNodeRedEntries(distDir, nodeRed)
    const files = await walkRegularFiles(distDir)
    return {
      packageJson,
      manifest: {
        formatVersion: FLOWUP_ARTIFACT_FORMAT_VERSION,
        flowupVersion: 'legacy',
        package: {
          name: requireNonEmptyString(packageJson.name, 'dist package name'),
          version: requireNonEmptyString(packageJson.version, 'dist package version'),
        },
        nodeRed: {
          nodes: normalizeEntryMap(nodeRed.nodes),
          plugins: normalizeEntryMap(nodeRed.plugins),
        },
        assets: {
          icons: files.filter(file => file.startsWith('icons/')),
          locales: files.filter(file => file.startsWith('locales/')),
          resources: files.filter(file => file.startsWith('resources/')),
        },
        runtime: {
          format: 'commonjs',
          externalDependencies: Object.keys(packageJson.dependencies ?? {}).sort(),
        },
      },
    }
  }

  const rawManifest = (await readJsonFile(manifestPath)) as Partial<FlowupArtifactManifest>
  if (rawManifest.formatVersion !== FLOWUP_ARTIFACT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported Flowup artifact format in ${manifestPath}: ${String(rawManifest.formatVersion)}.`,
    )
  }

  if (!rawManifest.nodeRed || !rawManifest.package || !rawManifest.assets || !rawManifest.runtime)
    throw new Error(`Invalid Flowup artifact manifest: ${manifestPath}`)

  const manifest = rawManifest as FlowupArtifactManifest
  validateArtifactShape(manifest, manifestPath)
  if (
    manifest.package.name !== packageJson.name ||
    manifest.package.version !== packageJson.version
  ) {
    throw new Error(
      `Flowup artifact package metadata does not match ${join(distDir, 'package.json')}.`,
    )
  }

  const packageNodeRed = requireNodeRedEntries(packageJson, join(distDir, 'package.json'))
  if (
    !entryMapsEqual(manifest.nodeRed.nodes, packageNodeRed.nodes) ||
    !entryMapsEqual(manifest.nodeRed.plugins, packageNodeRed.plugins)
  ) {
    throw new Error(
      `Flowup artifact Node-RED entries do not match ${join(distDir, 'package.json')}.`,
    )
  }

  await validateNodeRedEntries(distDir, manifest.nodeRed)
  await validateDeclaredAssets(distDir, manifest)

  return { manifest, packageJson }
}

export async function readDistPackageJson(distDir: string): Promise<FlowupPackageJson> {
  const packageJsonPath = join(distDir, 'package.json')
  if (!existsSync(packageJsonPath))
    throw new Error(`Missing dist package manifest: ${packageJsonPath}`)

  const packageJson = (await readJsonFile(packageJsonPath)) as FlowupPackageJson
  validatePublishableDependencies(packageJson, packageJsonPath)
  return packageJson
}

export async function validateNodeRedEntries(
  distDir: string,
  nodeRed: Pick<FlowupNodeRedField, 'nodes' | 'plugins'>,
): Promise<void> {
  const nodeEntries = Object.entries(nodeRed.nodes ?? {})
  const entries = [...nodeEntries, ...Object.entries(nodeRed.plugins ?? {})]

  if (!entries.length)
    throw new Error(`No Node-RED node or plugin entries found in ${join(distDir, 'package.json')}.`)

  for (const [entryName, entryPath] of entries) {
    const normalizedPath = normalizeArtifactPath(entryPath, `Node-RED entry "${entryName}"`)
    const absolutePath = resolve(distDir, ...normalizedPath.split('/'))
    await assertRegularFileInside(distDir, absolutePath, `Node-RED entry "${entryName}"`)
  }

  for (const [entryName, entryPath] of nodeEntries) {
    const normalizedPath = normalizeArtifactPath(entryPath, `Node-RED entry "${entryName}"`)
    const htmlPath = normalizedPath.replace(/\.c?js$/i, '.html')
    if (htmlPath === normalizedPath) {
      throw new Error(
        `Node-RED node entry "${entryName}" is missing its editor HTML artifact: ${htmlPath}`,
      )
    }
    await assertRegularFileInside(
      distDir,
      resolve(distDir, ...htmlPath.split('/')),
      `Node-RED node entry "${entryName}" editor HTML`,
    )
  }
}

export function normalizeArtifactPath(filePath: string, label: string): string {
  if (typeof filePath !== 'string' || !filePath.trim())
    throw new Error(`${label} must be a non-empty relative path.`)

  const slashPath = filePath.replaceAll('\\', '/')
  const normalizedPath = posix.normalize(slashPath)
  if (
    isAbsolute(filePath) ||
    /^[a-z]:\//i.test(slashPath) ||
    normalizedPath === '.' ||
    normalizedPath === '..' ||
    normalizedPath.startsWith('../') ||
    normalizedPath.startsWith('/')
  ) {
    throw new Error(`${label} must stay inside the package: ${filePath}`)
  }

  return normalizedPath
}

function requireNodeRedEntries(
  packageJson: FlowupPackageJson,
  filePath: string,
): FlowupNodeRedField {
  const nodeRed = packageJson['node-red']
  if (!nodeRed || typeof nodeRed !== 'object')
    throw new Error(`Missing valid "node-red" field in ${filePath}.`)
  return nodeRed
}

function normalizeEntryMap(
  value: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!value || !Object.keys(value).length) return undefined

  return Object.fromEntries(
    Object.entries(value).map(([name, filePath]) => [
      name,
      normalizeArtifactPath(filePath, `Node-RED entry "${name}"`),
    ]),
  )
}

function validateArtifactShape(manifest: FlowupArtifactManifest, manifestPath: string): void {
  requireNonEmptyString(manifest.flowupVersion, 'artifact Flowup version')
  requireNonEmptyString(manifest.package.name, 'artifact package name')
  requireNonEmptyString(manifest.package.version, 'artifact package version')

  for (const [groupName, entries] of Object.entries(manifest.nodeRed)) {
    if (entries === undefined) continue
    if (!entries || typeof entries !== 'object' || Array.isArray(entries))
      throw new Error(`Invalid ${groupName} entry map in ${manifestPath}.`)
    for (const [entryName, entryPath] of Object.entries(entries)) {
      if (typeof entryPath !== 'string')
        throw new Error(`Invalid path for artifact entry "${entryName}" in ${manifestPath}.`)
    }
  }

  for (const assetGroup of ['icons', 'locales', 'resources'] as const) {
    const assets = manifest.assets[assetGroup]
    if (!Array.isArray(assets) || assets.some(asset => typeof asset !== 'string'))
      throw new Error(`Invalid ${assetGroup} asset list in ${manifestPath}.`)
  }

  if (manifest.runtime.format !== 'commonjs')
    throw new Error(
      `Unsupported runtime format in ${manifestPath}: ${String(manifest.runtime.format)}`,
    )
  if (
    !Array.isArray(manifest.runtime.externalDependencies) ||
    manifest.runtime.externalDependencies.some(dependency => typeof dependency !== 'string')
  ) {
    throw new Error(`Invalid runtime externalDependencies in ${manifestPath}.`)
  }
}

function entryMapsEqual(
  left: Record<string, string> | undefined,
  right: Record<string, string> | undefined,
): boolean {
  const normalizedLeft = normalizeEntryMap(left) ?? {}
  const normalizedRight = normalizeEntryMap(right) ?? {}
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight)
}

async function validateDeclaredAssets(
  distDir: string,
  manifest: FlowupArtifactManifest,
): Promise<void> {
  const assets = [
    ...manifest.assets.icons,
    ...manifest.assets.locales,
    ...manifest.assets.resources,
  ]

  for (const assetPath of assets) {
    const normalizedPath = normalizeArtifactPath(assetPath, 'Artifact asset')
    await assertRegularFileInside(
      distDir,
      resolve(distDir, ...normalizedPath.split('/')),
      `Artifact asset "${normalizedPath}"`,
    )
  }
}

function validatePublishableDependencies(
  packageJson: FlowupPackageJson,
  packageJsonPath: string,
): void {
  for (const group of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const dependencies = packageJson[group]
    if (dependencies === undefined) continue
    if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies))
      throw new Error(`${group} must be an object in ${packageJsonPath}.`)

    for (const [name, range] of Object.entries(dependencies)) {
      if (typeof range !== 'string' || !range.trim())
        throw new Error(`${group}.${name} must be a non-empty string in ${packageJsonPath}.`)
      if (/^(?:catalog|file|link|portal|workspace):/i.test(range.trim())) {
        throw new Error(
          `Non-publishable dependency range for ${group}.${name} in ${packageJsonPath}: ${range}`,
        )
      }
    }
  }
}

async function assertRegularFileInside(
  rootDir: string,
  filePath: string,
  label: string,
): Promise<void> {
  let stats
  try {
    stats = await lstat(filePath)
  } catch (error) {
    throw new Error(`${label} points to a missing artifact: ${filePath}`, { cause: error })
  }

  if (!stats.isFile()) throw new Error(`${label} must point to a regular file: ${filePath}`)

  const [canonicalRoot, canonicalFile] = await Promise.all([realpath(rootDir), realpath(filePath)])
  const relPath = relative(canonicalRoot, canonicalFile)
  if (!relPath || relPath.startsWith('..') || isAbsolute(relPath))
    throw new Error(`${label} must stay inside the artifact directory: ${filePath}`)
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    throw new Error(`Unable to read JSON file ${filePath}.`, { cause: error })
  }
}

async function walkRegularFiles(rootDir: string, currentDir: string = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const output: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const absolutePath = join(currentDir, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      output.push(...(await walkRegularFiles(rootDir, absolutePath)))
      continue
    }
    if (isRegularFile(entry)) output.push(relative(rootDir, absolutePath).split(sep).join('/'))
  }

  return output.sort()
}

function isRegularFile(entry: Dirent): boolean {
  return entry.isFile()
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a non-empty string.`)
  return value
}

function stripEmptyEntryMaps(manifest: FlowupArtifactManifest): FlowupArtifactManifest {
  return {
    ...manifest,
    nodeRed: Object.fromEntries(
      Object.entries(manifest.nodeRed).filter(
        ([, entries]) => entries && Object.keys(entries).length,
      ),
    ),
  }
}
