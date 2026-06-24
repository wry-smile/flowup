export interface PackageJsonFilter {
  /** 显式保留的字段(优先级高于 omit) */
  include?: string[]
  /** 显式过滤的字段 */
  omit?: string[]
  /** 强制重命名字段(如: "version" → "_version") */
  rename?: Record<string, string>
}

export interface ResourceDefaults {
  /** 资源目录是否默认拷到 dist */
  icons?: boolean
  resources?: boolean
  locales?: boolean
  public?: boolean
  /** README.md / LICENSE 是否拷到 dist 顶层 */
  readme?: boolean
  license?: boolean
}

export interface BundleConfig {
  /** bundle 产物根路径,相对 monorepo 根 */
  output: string
  /** 顶层 meta package 名 */
  name: string
  /** 顶层 meta package version */
  version?: string
  /** 顶层 meta package 描述 */
  description?: string
  /** 顶层 meta package 作者 */
  author?: string
  /** 顶层 meta package license */
  license?: string
  /** 子包 glob,默认从 pnpm-workspace.yaml 读 */
  packages?: string[]
  /** 顶层 package.json 过滤规则 */
  packageJson?: PackageJsonFilter
  /** 是否在 bundle 完后自动跑 pnpm install */
  install?: boolean
}

export interface FlowupConfig {
  /** monorepo 根路径(相对 flowup.config.ts 所在目录),默认 '.' */
  root?: string
  /** 资源约定默认开关 + 可覆盖 */
  resources?: ResourceDefaults
  /** bundle 行为配置 */
  bundle?: BundleConfig
  /** 单包 package.json 过滤(默认走 BundleConfig.packageJson) */
  packageJson?: PackageJsonFilter
}

export type { FlowupConfig as FlowupConfigType }
