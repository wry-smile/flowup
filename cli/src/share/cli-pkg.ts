import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface CliPackageJson {
  name?: string
  version: string
}

const CLI_PKG_NAME = '@wry-smile/flowup'
const FALLBACK_VERSION = '0.0.0'

export function resolveCliVersion(): string {
  return readCliPackageJson().version
}

export function readCliPackageJson(): CliPackageJson {
  const root = resolveCliPackageRoot()
  if (!root) return { name: CLI_PKG_NAME, version: FALLBACK_VERSION }
  try {
    const raw = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as {
      name?: string
      version?: string
    }
    return { name: raw.name, version: raw.version ?? FALLBACK_VERSION }
  } catch {
    return { name: CLI_PKG_NAME, version: FALLBACK_VERSION }
  }
}

export function resolveCliPackageRoot(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [resolve(here, '..'), resolve(here, '..', '..')]

  for (const root of candidates) {
    const candidate = resolve(root, 'package.json')
    if (!existsSync(candidate)) continue
    try {
      const raw = JSON.parse(readFileSync(candidate, 'utf-8')) as {
        name?: string
      }
      if (raw.name === CLI_PKG_NAME) return root
    } catch {
      continue
    }
  }

  return undefined
}
