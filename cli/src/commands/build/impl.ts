import type { UserConfig } from 'vite'
import type { FlowupConfig, FlowupEntryGroup } from '../../sdk/define-config'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { build, loadConfigFromFile } from 'vite'
import { getFlowupEntryGroups, resolveFlowupViteConfig } from '../../sdk/define-config'
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
  editor: ModeBuildPlan[]
  finalOutDir: string
  runtime: ModeBuildPlan[]
}

interface FlowupUserConfig extends UserConfig {
  flowup?: FlowupConfig
}

export async function runBuild(options: BuildOptions = {}): Promise<string> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const configFile = options.config ? resolve(cwd, options.config) : await findViteConfig(cwd)

  if (!existsSync(configFile)) throw new Error(`Flowup/Vite config file not found: ${configFile}`)

  const mode = options.mode ?? 'all'
  if (!['all', 'runtime', 'editor'].includes(mode)) throw new Error(`Invalid build mode: ${mode}`)
  if (mode === 'all') {
    const plan = await resolveBuildPlan(cwd, configFile)
    await runTransactionalBuild(plan)
    return plan.finalOutDir
  }

  const groups = await loadBuildGroups(configFile)
  const plans = await Promise.all(
    groups.map(group => loadModeBuildPlan(cwd, configFile, mode, group)),
  )
  await runPartialBuild(plans, mode)
  return resolve(plans[0].rootDir, '.flowup', mode)
}

async function resolveBuildPlan(cwd: string, configFile: string): Promise<BuildPlan> {
  const groups = await loadBuildGroups(configFile)
  const runtime = await Promise.all(
    groups.map(group => loadModeBuildPlan(cwd, configFile, 'runtime', group)),
  )
  const editor = await Promise.all(
    groups.map(group => loadModeBuildPlan(cwd, configFile, 'editor', group)),
  )

  if ([...runtime, ...editor].some(plan => plan.rootDir !== runtime[0].rootDir)) {
    throw new Error('Runtime and editor builds must use the same root directory.')
  }
  if ([...runtime, ...editor].some(plan => plan.outDir !== runtime[0].outDir)) {
    throw new Error('Runtime and editor builds must use the same output directory.')
  }

  return {
    editor,
    finalOutDir: runtime[0].outDir,
    runtime,
  }
}

async function loadBuildGroups(configFile: string): Promise<(FlowupEntryGroup | undefined)[]> {
  const loadedConfig = await loadConfigFromFile(
    { command: 'build', mode: 'runtime', isSsrBuild: true, isPreview: false },
    configFile,
    dirname(configFile),
    'silent',
    undefined,
    'runner',
  )
  if (!loadedConfig) throw new Error(`Unable to load Flowup/Vite config: ${configFile}`)
  const flowup = (loadedConfig.config as FlowupUserConfig).flowup
  if (!flowup) return [undefined]
  const groups = getFlowupEntryGroups(flowup, dirname(configFile))
  return groups.length ? groups : [undefined]
}

async function loadModeBuildPlan(
  cwd: string,
  configFile: string,
  mode: Exclude<BuildMode, 'all'>,
  group?: FlowupEntryGroup,
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
    ? resolveFlowupViteConfig(loaded.flowup, mode, dirname(configFile), group)
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
    for (const [index, runtime] of plan.runtime.entries())
      await runViteBuild(runtime.config, 'runtime', stagingDir, index === 0)
    for (const editor of plan.editor) await runViteBuild(editor.config, 'editor', stagingDir, false)
    await writeFlowupArtifactManifest(stagingDir, resolveCliVersion())
    await commitStagedDirectory(stagingDir, plan.finalOutDir)
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}

async function runPartialBuild(
  plans: ModeBuildPlan[],
  mode: Exclude<BuildMode, 'all'>,
): Promise<void> {
  const outputDir = resolve(plans[0].rootDir, '.flowup', mode)
  const stagingDir = await createStagingDir(outputDir)

  try {
    for (const [index, plan] of plans.entries())
      await runViteBuild(plan.config, mode, stagingDir, index === 0)
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
