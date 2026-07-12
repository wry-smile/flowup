import { resolve } from 'node:path'
import process from 'node:process'
import { build } from 'vite'
import { findViteConfig } from '../../share/monorepo'

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

  const modes: Exclude<BuildMode, 'all'>[] = options.mode && options.mode !== 'all'
    ? [options.mode]
    : ['runtime', 'editor']

  const originalCwd = process.cwd()
  if (originalCwd !== cwd)
    process.chdir(cwd)

  try {
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
