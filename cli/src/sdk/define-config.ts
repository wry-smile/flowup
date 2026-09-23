import type { PluginOption, UserConfig, UserConfigFnObject } from 'vite'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { mergeConfig, defineConfig as viteDefineConfig } from 'vite'
import { flowupClientHtmlEntryPlugin } from './plugins/client-html-entry'
import { flowupGroupEntryPlugin, type FlowupGroupEntry } from './plugins/group-entry'
import { flowupPackagePlugin } from './plugins/package'
import { flowupStaticAssetsPlugin } from './plugins/static-assets'

export interface FlowupAssembleConfig {
  cwd?: string
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

export interface FlowupNodeRedDevConfig {
  /** Node-RED port. Defaults to 1880. */
  port?: number
  /** Host/interface for the editor. Defaults to Node-RED's own setting. */
  host?: string
  /** Node-RED data directory, relative to the Flowup package root. */
  userDir?: string
  /** Existing Node-RED settings.js, relative to the Flowup config file. */
  settingsFile?: string
  /** Flow file name passed to Node-RED. */
  flowsFile?: string
  /** Open the editor without starting flows. */
  safe?: boolean
}

export interface FlowupConfig {
  scope?: string
  type?: 'nodes' | 'plugins'
  root?: string
  outDir?: string
  assemble?: FlowupAssembleConfig
  nodeRed?: FlowupNodeRedDevConfig
  /** Optional explicit entry list. Without it, nodes/* and plugins/* are discovered. */
  entries?: {
    nodes?: Record<string, FlowupEntryConfig>
    plugins?: Record<string, FlowupEntryConfig>
  }
  runtime?: {
    entry?: string
    config?: UserConfig
  }
  client?: {
    entry?: string
    template?: string
    plugins?: PluginOption[] | ((group?: FlowupEntryGroup) => PluginOption[])
    config?: UserConfig
  }
  package?: {
    extra?: Record<string, unknown>
  }
}

export interface FlowupEntryConfig {
  /** Defaults to <group>/<name>/runtime/index.ts. */
  runtime?: string
  /** Defaults to <group>/<name>/client/index.ts. */
  client?: string
  /** Defaults to <group>/<name>/client/editor.html. */
  template?: string
  /** Applied to the whole group build. Filter inside the plugin for entry-specific work. */
  clientPlugins?: PluginOption[]
  runtimePlugins?: PluginOption[]
}

export type FlowupEntryGroup = 'nodes' | 'plugins'

export function getFlowupEntryGroups(
  config: FlowupConfig,
  baseDir = process.cwd(),
): FlowupEntryGroup[] {
  const entries = resolveEntries(config, path.resolve(baseDir, config.root ?? '.'))
  if (!entries) return []
  const groups: FlowupEntryGroup[] = []
  if (Object.keys(entries.nodes ?? {}).length) groups.push('nodes')
  if (Object.keys(entries.plugins ?? {}).length) groups.push('plugins')
  if (!groups.length)
    throw new Error('Flowup multi-entry package needs at least one child in nodes/ or plugins/.')
  return groups
}

function resolveEntries(config: FlowupConfig, root: string): FlowupConfig['entries'] {
  if (config.entries) return config.entries
  const entries: NonNullable<FlowupConfig['entries']> = {}
  let hasGroupDirectory = false
  for (const group of ['nodes', 'plugins'] as const) {
    const directory = path.resolve(root, group)
    if (!existsSync(directory)) continue
    hasGroupDirectory = true
    const names = readdirSync(directory, { withFileTypes: true })
      .filter(item => item.isDirectory() && /^[a-z][a-z0-9-]*$/.test(item.name))
      .map(item => item.name)
      .sort()
    if (names.length) entries[group] = Object.fromEntries(names.map(name => [name, {}]))
  }
  return hasGroupDirectory ? entries : undefined
}

export function defineConfig(config: FlowupConfig): UserConfigFnObject {
  return viteDefineConfig(({ mode }): UserConfig =>
    resolveFlowupViteConfig(config, mode, process.cwd()),
  )
}

export function resolveFlowupViteConfig(
  config: FlowupConfig,
  mode: string,
  baseDir: string,
  requestedGroup?: FlowupEntryGroup,
): UserConfig {
  const root = path.resolve(baseDir, config.root ?? '.')
  const outDir = path.resolve(root, config.outDir ?? 'dist')

  if (mode === 'assemble') return withFlowupMeta({ root }, config)

  if (!config.scope)
    throw new Error('flowup defineConfig requires "scope" for runtime/editor builds.')

  const entries = resolveEntries(config, root)
  const groups = getFlowupEntryGroups(config, baseDir)
  if (groups.length && !/^[a-z][a-z0-9-]*$/.test(config.scope))
    throw new Error('Grouped Flowup scope must be a kebab-case name.')
  const group = requestedGroup ?? groups[0]
  if (requestedGroup && !groups.includes(requestedGroup))
    throw new Error(`Flowup entry group is not configured: ${requestedGroup}`)
  if (group && (config.runtime?.entry || config.client?.entry || config.client?.template)) {
    throw new Error('Grouped entries cannot be combined with single-entry runtime/client paths.')
  }
  const groupEntries = group ? resolveGroupEntries(entries, root, group) : []
  const entryName = group ? `${config.scope}-${group}` : config.scope
  const runtimeEntry = group
    ? `virtual:flowup-runtime-${group}`
    : path.resolve(root, config.runtime?.entry ?? 'runtime/index.ts')
  const clientEntry = group
    ? `virtual:flowup-editor-${group}`
    : path.resolve(root, config.client?.entry ?? 'client/index.ts')
  const clientTemplates = group
    ? groupEntries.map(entry => entry.template)
    : [path.resolve(root, config.client?.template ?? 'client/editor.html')]
  const packageEntries = group ? createPackageEntries(config.scope, entries) : undefined
  const entryPlugins = group
    ? Object.values(entries?.[group] ?? {}).flatMap(entry => entry.clientPlugins ?? [])
    : []
  const runtimePlugins = group
    ? Object.values(entries?.[group] ?? {}).flatMap(entry => entry.runtimePlugins ?? [])
    : []

  let resolved: UserConfig
  switch (mode) {
    case 'runtime':
      resolved = mergeConfig(
        {
          root,
          build: {
            outDir,
            emptyOutDir: true,
            ssr: true,
            rolldownOptions: {
              platform: 'node',
              input: {
                [entryName]: runtimeEntry,
              },
              preserveEntrySignatures: 'strict',
              output: {
                format: 'commonjs',
                codeSplitting: false,
                entryFileNames: '[name].js',
              },
            },
          },
          plugins: [
            ...(group ? [flowupGroupEntryPlugin('runtime', group, groupEntries)] : []),
            ...runtimePlugins,
          ],
        },
        config.runtime?.config ?? {},
      )
      break

    case 'editor':
      resolved = mergeConfig(
        {
          root,
          build: {
            outDir,
            emptyOutDir: false,
            cssCodeSplit: false,
            rolldownOptions: {
              platform: 'browser',
              input: {
                [entryName]: clientEntry,
              },
              output: {
                format: 'iife',
                codeSplitting: false,
                entryFileNames: '[name].js',
              },
            },
          },
          plugins: [
            ...(typeof config.client?.plugins === 'function'
              ? config.client.plugins(group)
              : (config.client?.plugins ?? [])),
            ...(group ? [flowupGroupEntryPlugin('editor', group, groupEntries)] : []),
            ...entryPlugins,
            flowupPackagePlugin({
              cwd: root,
              name: config.scope,
              type: config.type ?? 'nodes',
              main: group ? `${config.scope}-${groups[0]}.js` : undefined,
              entries: packageEntries,
              extra: config.package?.extra,
            }),
            flowupClientHtmlEntryPlugin({
              name: entryName,
              ...(group ? { templates: clientTemplates } : { template: clientTemplates[0] }),
              preservedAssetDirectories: ['icons', 'resources', 'locales'],
            }),
            flowupStaticAssetsPlugin({
              cwd: root,
              dirs: ['icons', 'resources', 'locales'],
              mappedDirs: group
                ? Object.keys(entries?.[group] ?? {}).flatMap(name => [
                    { dir: `${group}/${name}/icons`, outDir: `icons/${name}` },
                    { dir: `${group}/${name}/resources`, outDir: `resources/${name}` },
                    { dir: `${group}/${name}/locales`, outDir: 'locales' },
                  ])
                : [],
            }),
          ],
        },
        config.client?.config ?? {},
      )
      break

    default:
      throw new Error(`Unsupported build mode: ${mode}. Please use "runtime" or "editor".`)
  }

  return withFlowupMeta(
    {
      ...resolved,
      root: path.resolve(baseDir, resolved.root ?? root),
    },
    config,
  )
}

function resolveGroupEntries(
  entries: FlowupConfig['entries'],
  root: string,
  group: FlowupEntryGroup,
): FlowupGroupEntry[] {
  return Object.entries(entries?.[group] ?? {}).map(([name, entry]) => {
    if (!/^[a-z][a-z0-9-]*$/.test(name))
      throw new Error(`Flowup ${group} entry name must be kebab-case: ${name}`)
    const base = `${group}/${name}`
    return {
      runtime: path.resolve(
        root,
        entry.runtime ?? defaultEntryPath(root, `${base}/runtime/index.ts`, `${base}/runtime.ts`),
      ),
      client: path.resolve(
        root,
        entry.client ?? defaultEntryPath(root, `${base}/client/index.ts`, `${base}/editor.ts`),
      ),
      template: resolveEntryTemplate(root, base, entry.template),
    }
  })
}

function resolveEntryTemplate(root: string, base: string, configured?: string): string {
  if (configured) return path.resolve(root, configured)
  return path.resolve(
    root,
    defaultEntryPath(root, `${base}/client/editor.html`, `${base}/editor.html`),
  )
}

function defaultEntryPath(root: string, preferred: string, legacy: string): string {
  return existsSync(path.resolve(root, preferred)) || !existsSync(path.resolve(root, legacy))
    ? preferred
    : legacy
}

function createPackageEntries(
  scope: string,
  configEntries: FlowupConfig['entries'],
): NonNullable<Parameters<typeof flowupPackagePlugin>[0]['entries']> {
  const entries: {
    nodes?: Record<string, string>
    plugins?: Record<string, string>
  } = {}
  if (configEntries?.nodes && Object.keys(configEntries.nodes).length)
    entries.nodes = { [`${scope}-nodes`]: `${scope}-nodes.js` }
  if (configEntries?.plugins && Object.keys(configEntries.plugins).length)
    entries.plugins = { [`${scope}-plugins`]: `${scope}-plugins.js` }
  return entries
}

function withFlowupMeta(config: UserConfig, flowup: FlowupConfig): UserConfig {
  return {
    ...config,
    flowup,
  } as UserConfig
}
