import { dirname, join } from 'node:path'
import process from 'node:process'
import { findUp } from 'find-up'

export async function findPnpmWorkspace(startDir: string = process.cwd()): Promise<string | null> {
  const found = await findUp('pnpm-workspace.yaml', { cwd: startDir, type: 'file' })
  return found ?? null
}

export async function isInMonorepo(startDir: string = process.cwd()): Promise<boolean> {
  return (await findPnpmWorkspace(startDir)) !== null
}

export async function findWorkspaceRoot(startDir: string = process.cwd()): Promise<string | null> {
  const workspace = await findPnpmWorkspace(startDir)
  return workspace ? dirname(workspace) : null
}

export function joinWorkspacePath(rootDir: string, relativePath: string): string {
  return join(rootDir, relativePath)
}

export async function findViteConfig(startDir: string = process.cwd()): Promise<string> {
  const candidates = [
    'flowup.config.ts',
    'flowup.config.js',
    'flowup.config.mjs',
    'flowup.config.cjs',
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.cjs',
  ]

  for (const name of candidates) {
    const found = await findUp(name, { cwd: startDir, type: 'file' })
    if (found)
      return found
  }

  return join(startDir, 'flowup.config.ts')
}
