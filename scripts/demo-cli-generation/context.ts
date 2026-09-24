import { join, resolve } from 'node:path'

export const repositoryRoot = resolve(import.meta.dirname, '../..')
export const cli = join(repositoryRoot, 'cli/dist/bin/flowup.js')
