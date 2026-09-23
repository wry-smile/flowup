import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { runGenerator } from '../dist/internal.js'
import { createTemporaryRoot } from './helpers/fixtures.mjs'

test('generator rejects invalid and escaping names before writing files', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-gen-name-')
  const escapedName = `../${basename(rootDir)}-escaped`
  const escapedDir = join(dirname(rootDir), `${basename(rootDir)}-escaped`)
  const originalCwd = process.cwd()
  process.chdir(rootDir)

  try {
    for (const name of [escapedName, 'Uppercase', 'name with spaces']) {
      await assert.rejects(
        runGenerator({
          type: 'node',
          name,
          locales: ['en-US'],
          framework: 'vanilla',
          nonInteractive: true,
        }),
        /Invalid name/,
      )
    }
  } finally {
    process.chdir(originalCwd)
  }

  assert.equal(existsSync(escapedDir), false)
})
