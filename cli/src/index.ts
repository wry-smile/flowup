/**
 * 公开 API 出口 —— 用户从 `@wry-smile/flowup` 拿到的东西。
 *
 * - 子命令 register 函数 (registerBuildCommand / registerDevCommand / registerGenCommand / registerBundleCommand)
 *   不在公开 API 里,因为这些是给 bin/flowup.ts 装配用的;用户如果想自己包 bin,
 *   可以从 `@wry-smile/flowup/commands/build/command` 这种 subpath 拿。
 * - 实现层 (impl / impl-entry / impl-watch / impl-dev) 同样不进公开 API。
 */

// build 工具层
export {
  defineConfig as defineFlowupBuildConfig,
} from './build/define-config'

export type {
  DefineConfigOptions,
  ResolvedConfig,
} from './build/define-config'

export type {
  CopyTask,
} from './build/plugins/copy-file'

// bundle
export {
  buildBundleManifest,
  bundleMonorepo,
} from './commands/bundle/impl'
export type {
  BundleOptions,
  BundleResult,
} from './commands/bundle/impl'

// dev
export {
  runBuildWatch,
  runDev,
} from './commands/dev/index'
export type {
  RunBuildWatchOptions,
  RunDevOptions,
} from './commands/dev/index'
// gen
export {
  runGenerator,
} from './commands/gen/impl'

export type {
  GenOptions,
  GenResolved,
  GenType,
} from './commands/gen/impl'
// config
export {
  defineConfig,
  loadFlowupConfig,
} from './config/load'

export {
  DEFAULT_PKG_INCLUDE,
  DEFAULT_PKG_OMIT,
  filterPackageJson,
} from './config/package-json'
export type {
  BundleConfig,
  FlowupConfig,
  PackageJsonFilter,
  ResourceDefaults,
} from './config/types'

// monorepo / find
export {
  findPnpmWorkspace,
  findViteConfig,
  isInMonorepo,
  scanMonorepoPackages,
} from './share/monorepo'
export type {
  ScanOptions,
  WorkspacePackage,
} from './share/monorepo'
