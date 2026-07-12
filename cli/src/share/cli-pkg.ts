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
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, '..', 'package.json'),
    resolve(here, '..', '..', 'package.json'),
  ]

  for (const candidate of candidates) {
    if (!existsSync(candidate))
      continue
    try {
      const raw = JSON.parse(readFileSync(candidate, 'utf-8')) as {
        name?: string
        version?: string
      }
      if (raw.name === CLI_PKG_NAME)
        return { name: raw.name, version: raw.version ?? FALLBACK_VERSION }
    }
    catch {
      continue
    }
  }

  return { name: CLI_PKG_NAME, version: FALLBACK_VERSION }
}
