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
        'name': srcPkg.name ?? `node-red-contrib-${options.name}`,
        'version': srcPkg.version ?? '0.0.0',
        'description': srcPkg.description ?? '',
        'author': srcPkg.author ?? '',
        'license': srcPkg.license ?? 'ISC',
        'keywords': Array.isArray(srcPkg.keywords) ? srcPkg.keywords : [],
        'type': 'commonjs',
        'main': `./${options.name}.js`,
        'dependencies': srcPkg.dependencies,
        'peerDependencies': srcPkg.peerDependencies,
        'optionalDependencies': srcPkg.optionalDependencies,
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
  if (!existsSync(filePath))
    return {}

  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, any>
  }
  catch {
    return {}
  }
}

function normalizeNodeRedField(
  nodeRed: unknown,
  options: FlowupPackagePluginOptions,
): Record<string, unknown> {
  if (nodeRed && typeof nodeRed === 'object')
    return nodeRed as Record<string, unknown>

  return {
    [options.type ?? 'nodes']: {
      [options.name]: `${options.name}.js`,
    },
  }
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
