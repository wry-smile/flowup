import type { UserConfig } from 'vite'
import type { FlowupConfig } from '../../sdk/define-config'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { build, loadConfigFromFile } from 'vite'
import { resolveFlowupViteConfig } from '../../sdk/define-config'
import { resolveCliVersion } from '../../share/cli-pkg'
import { writeFlowupArtifactManifest } from '../../share/flowup-artifact'
import { findViteConfig } from '../../share/monorepo'
import { commitStagedDirectory, createStagingDir } from '../../share/safe-fs'

export type BuildMode = 'all' | 'runtime' | 'editor'

export interface BuildOptions {
  cwd?: string
  config?: string
  mode?: BuildMode
}

interface ModeBuildPlan {
  config: UserConfig
  outDir: string
  rootDir: string
}

interface BuildPlan {
  editor: ModeBuildPlan
  finalOutDir: string
  runtime: ModeBuildPlan
}

interface FlowupUserConfig extends UserConfig {
  flowup?: FlowupConfig
}

export async function runBuild(options: BuildOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const configFile = options.config ? resolve(cwd, options.config) : await findViteConfig(cwd)

  if (!existsSync(configFile)) throw new Error(`Flowup/Vite config file not found: ${configFile}`)

  const mode = options.mode ?? 'all'
  if (!['all', 'runtime', 'editor'].includes(mode)) throw new Error(`Invalid build mode: ${mode}`)
  if (mode === 'all') {
    await runTransactionalBuild(await resolveBuildPlan(cwd, configFile))
    return
  }

  await runPartialBuild(await loadModeBuildPlan(cwd, configFile, mode), mode)
}

async function resolveBuildPlan(cwd: string, configFile: string): Promise<BuildPlan> {
  const runtime = await loadModeBuildPlan(cwd, configFile, 'runtime')
  const editor = await loadModeBuildPlan(cwd, configFile, 'editor')

  if (runtime.rootDir !== editor.rootDir) {
    throw new Error(
      `Runtime and editor builds must use the same root directory: ${runtime.rootDir} vs ${editor.rootDir}`,
    )
  }
  if (runtime.outDir !== editor.outDir) {
    throw new Error(
      `Runtime and editor builds must use the same output directory: ${runtime.outDir} vs ${editor.outDir}`,
    )
  }

  return {
    editor,
    finalOutDir: runtime.outDir,
    runtime,
  }
}

async function loadModeBuildPlan(
  cwd: string,
  configFile: string,
  mode: Exclude<BuildMode, 'all'>,
): Promise<ModeBuildPlan> {
  const loadedConfig = await loadConfigFromFile(
    {
      command: 'build',
      mode,
      isSsrBuild: mode === 'runtime',
      isPreview: false,
    },
    configFile,
    dirname(configFile),
    'silent',
    undefined,
    'runner',
  )

  if (!loadedConfig) throw new Error(`Unable to load Flowup/Vite config: ${configFile}`)

  const loaded = loadedConfig.config as FlowupUserConfig
  const config = loaded.flowup
    ? resolveFlowupViteConfig(loaded.flowup, mode, dirname(configFile))
    : loaded
  const rootDir = resolve(loaded.flowup ? dirname(configFile) : cwd, config.root ?? '.')
  const outDir = resolve(rootDir, config.build?.outDir ?? 'dist')

  if (loaded.flowup) {
    const declaredRoot = resolve(dirname(configFile), loaded.flowup.root ?? '.')
    if (rootDir !== declaredRoot) {
      throw new Error(
        `${mode} config cannot override root. Set the top-level Flowup root instead: ${rootDir}`,
      )
    }
    validateFlowupBuildInvariants(config, mode)
  }

  return {
    config: {
      ...config,
      root: rootDir,
    },
    outDir,
    rootDir,
  }
}

function validateFlowupBuildInvariants(config: UserConfig, mode: Exclude<BuildMode, 'all'>): void {
  const output = config.build?.rolldownOptions?.output
  if (!output || Array.isArray(output))
    throw new Error(`${mode} build must define exactly one output configuration.`)

  const expectedFormat = mode === 'runtime' ? 'commonjs' : 'iife'
  if (output.format !== expectedFormat)
    throw new Error(`${mode} build output format must remain ${expectedFormat}.`)
  if (output.codeSplitting !== false)
    throw new Error(`${mode} build must keep codeSplitting disabled.`)
  if (output.entryFileNames !== '[name].js')
    throw new Error(`${mode} build entryFileNames must remain "[name].js".`)

  if (mode === 'runtime' && config.build?.ssr !== true)
    throw new Error('runtime build must keep SSR mode enabled.')
  if (mode === 'editor' && config.build?.cssCodeSplit !== false)
    throw new Error('editor build must keep CSS code splitting disabled.')
}

async function runTransactionalBuild(plan: BuildPlan): Promise<void> {
  const stagingDir = await createStagingDir(plan.finalOutDir)

  try {
    await runViteBuild(plan.runtime.config, 'runtime', stagingDir, true)
    await runViteBuild(plan.editor.config, 'editor', stagingDir, false)
    await writeFlowupArtifactManifest(stagingDir, resolveCliVersion())
    await commitStagedDirectory(stagingDir, plan.finalOutDir)
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}

async function runPartialBuild(
  plan: ModeBuildPlan,
  mode: Exclude<BuildMode, 'all'>,
): Promise<void> {
  const outputDir = resolve(plan.rootDir, '.flowup', mode)
  const stagingDir = await createStagingDir(outputDir)

  try {
    await runViteBuild(plan.config, mode, stagingDir, true)
    await commitStagedDirectory(stagingDir, outputDir)
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}

async function runViteBuild(
  config: UserConfig,
  mode: Exclude<BuildMode, 'all'>,
  outDir: string,
  emptyOutDir: boolean,
): Promise<void> {
  await build({
    ...config,
    configFile: false,
    mode,
    build: {
      ...config.build,
      outDir,
      emptyOutDir,
    },
  })
}
