import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { build, loadConfigFromFile } from 'vite'
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

export async function runBuild(options: BuildOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const configFile = options.config
    ? resolve(cwd, options.config)
    : await findViteConfig(cwd)

  if (!existsSync(configFile))
    throw new Error(`Flowup/Vite config file not found: ${configFile}`)

  const modes: Exclude<BuildMode, 'all'>[] = options.mode && options.mode !== 'all'
    ? [options.mode]
    : ['runtime', 'editor']

  const originalCwd = process.cwd()
  if (originalCwd !== cwd)
    process.chdir(cwd)

  try {
    if (modes.length === 2) {
      await runTransactionalBuild(cwd, configFile, modes)
      return
    }

    for (const mode of modes) {
      await build({
        configFile,
        configLoader: 'runner',
        mode,
      })
    }
  }
  finally {
    if (originalCwd !== cwd)
      process.chdir(originalCwd)
  }
}

async function runTransactionalBuild(
  cwd: string,
  configFile: string,
  modes: Exclude<BuildMode, 'all'>[],
): Promise<void> {
  const loadedConfig = await loadConfigFromFile(
    {
      command: 'build',
      mode: 'runtime',
      isSsrBuild: true,
      isPreview: false,
    },
    configFile,
    cwd,
    'silent',
    undefined,
    'runner',
  )

  if (!loadedConfig)
    throw new Error(`Unable to load Flowup/Vite config: ${configFile}`)

  const configRoot = resolve(cwd, loadedConfig.config.root ?? '.')
  const finalOutDir = resolve(configRoot, loadedConfig.config.build?.outDir ?? 'dist')
  const stagingDir = await createStagingDir(finalOutDir)

  try {
    for (const mode of modes) {
      await build({
        configFile,
        configLoader: 'runner',
        mode,
        build: {
          outDir: stagingDir,
          emptyOutDir: mode === 'runtime',
        },
      })
    }

    await writeFlowupArtifactManifest(stagingDir, resolveCliVersion())
    await commitStagedDirectory(stagingDir, finalOutDir)
  }
  catch (error) {
    await rm(stagingDir, { recursive: true, force: true })
    throw error
  }
}
