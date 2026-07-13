import type { FlowupAssembleConfig, FlowupConfig } from '../sdk/define-config'
import type { UserConfig } from 'vite'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { loadConfigFromFile } from 'vite'
import { findAssembleConfig } from './monorepo'

export interface LoadFlowupAssembleConfigOptions {
  cwd?: string
  config?: string
}

export interface LoadedFlowupAssembleConfig {
  path: string
  rootDir: string
  flowup: FlowupConfig
  assemble: FlowupAssembleConfig | undefined
}

interface FlowupUserConfig extends UserConfig {
  flowup?: FlowupConfig
}

export async function loadFlowupAssembleConfig(
  options: LoadFlowupAssembleConfigOptions = {},
): Promise<LoadedFlowupAssembleConfig | null> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const configPath = options.config
    ? resolve(cwd, options.config)
    : await findAssembleConfig(cwd)

  if (!configPath)
    return null

  const loaded = await loadConfigFromFile(
    {
      command: 'build',
      mode: 'assemble',
      isSsrBuild: false,
      isPreview: false,
    },
    configPath,
    dirname(configPath),
    'silent',
    undefined,
    'runner',
  )

  if (!loaded)
    return null

  const flowup = readFlowupConfig(loaded.config)
  return {
    path: loaded.path,
    rootDir: dirname(loaded.path),
    flowup,
    assemble: flowup.assemble,
  }
}

function readFlowupConfig(config: UserConfig): FlowupConfig {
  const flowup = (config as FlowupUserConfig).flowup
  if (flowup)
    return flowup

  return config as FlowupConfig
}
