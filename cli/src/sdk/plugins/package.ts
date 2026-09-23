import type { Plugin } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export interface FlowupPackagePluginOptions {
  name: string
  cwd?: string
  type?: 'nodes' | 'plugins'
  extra?: Record<string, unknown>
}

export function flowupPackagePlugin(options: FlowupPackagePluginOptions): Plugin {
  return {
    name: 'flowup-package',
    apply: 'build',
    generateBundle() {
      const cwd = path.resolve(options.cwd ?? process.cwd())
      const srcPkgPath = path.resolve(cwd, 'package.json')
      const srcPkg = readSourcePackageJson(srcPkgPath)

      const packageJson = {
        name: srcPkg.name ?? `node-red-contrib-${options.name}`,
        version: srcPkg.version ?? '0.0.0',
        description: srcPkg.description ?? '',
        author: srcPkg.author ?? '',
        license: srcPkg.license ?? 'ISC',
        keywords: normalizeKeywords(srcPkg.keywords),
        type: 'commonjs',
        main: `./${options.name}.js`,
        dependencies: srcPkg.dependencies,
        peerDependencies: srcPkg.peerDependencies,
        optionalDependencies: srcPkg.optionalDependencies,
        ...options.extra,
        'node-red': normalizeNodeRedField(srcPkg['node-red'], options),
      }

      this.emitFile({
        type: 'asset',
        fileName: 'package.json',
        source: `${JSON.stringify(stripUndefined(packageJson), null, 2)}\n`,
      })
    },
  }
}

function readSourcePackageJson(filePath: string): Record<string, any> {
  if (!existsSync(filePath)) throw new Error(`Source package.json not found: ${filePath}`)

  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, any>
  } catch (error) {
    throw new Error(`Unable to read source package.json: ${filePath}`, { cause: error })
  }
}

function normalizeNodeRedField(
  nodeRed: unknown,
  options: FlowupPackagePluginOptions,
): Record<string, unknown> {
  if (nodeRed && typeof nodeRed === 'object') {
    const value = nodeRed as Record<string, unknown>
    return {
      ...value,
      ...normalizeEntryGroup(value.nodes, 'nodes'),
      ...normalizeEntryGroup(value.plugins, 'plugins'),
    }
  }

  return {
    [options.type ?? 'nodes']: {
      [options.name]: `${options.name}.js`,
    },
  }
}

function normalizeEntryGroup(value: unknown, key: 'nodes' | 'plugins'): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {}

  return {
    [key]: Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([name, entryPath]) => {
        if (typeof entryPath !== 'string')
          throw new TypeError(`node-red.${key}.${name} must be a string path.`)

        return [name, stripDistPrefix(entryPath)]
      }),
    ),
  }
}

function stripDistPrefix(filePath: string): string {
  return filePath
    .replaceAll('\\', '/')
    .replace(/^\.\/dist\//, '')
    .replace(/^dist\//, '')
}

function normalizeKeywords(value: unknown): string[] {
  const keywords = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

  if (!keywords.some(keyword => keyword.toLowerCase() === 'node-red')) keywords.push('node-red')

  return keywords
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}
