import type { FlowupConfig } from './types'

/**
 * 运行时必须保留的 package.json 字段。
 * 拷贝到 dist 时默认只保留这些,其余全过滤。
 */
export const DEFAULT_PKG_INCLUDE = [
  'name',
  'version',
  'type',
  'node-red',
  'description',
  'author',
  'license',
  'keywords',
  'engines',
  'main',
  'files',
] as const

/**
 * 永远过滤的字段,与 include 是 AND 关系。
 * 即便用户 include 里写了 scripts,也会被 omit 兜底。
 */
export const DEFAULT_PKG_OMIT = [
  'scripts',
  'devDependencies',
  'dependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'optionalDependencies',
] as const

export function filterPackageJson(
  source: Record<string, unknown>,
  config?: FlowupConfig['packageJson'],
): Record<string, unknown> {
  const include = new Set<string>(
    config?.include ?? [...DEFAULT_PKG_INCLUDE],
  )
  const omit = new Set<string>([
    ...DEFAULT_PKG_OMIT,
    ...(config?.omit ?? []),
  ])
  const rename = config?.rename ?? {}

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    if (!include.has(key))
      continue
    if (omit.has(key))
      continue
    const targetKey = rename[key] ?? key
    out[targetKey] = source[key]
  }
  return out
}
