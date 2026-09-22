/* eslint-disable antfu/no-import-dist, test/no-import-node-test */
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import {
  commitStagedDirectory,
  createStagingDir,
  readFlowupArtifact,
  runAssemble,
  runBuild,
} from '../dist/index.js'
import {
  createBuildFixture,
  createBuiltPackage,
  createTemporaryRoot,
  snapshotDirectory,
  writeJson,
} from './helpers/fixtures.mjs'

test('build failures leave the previous dist byte-for-byte unchanged', async (t) => {
  const scenarios = [
    { name: 'runtime build failure', runtime: false, editor: true },
    { name: 'editor build failure', runtime: true, editor: false },
    { name: 'artifact validation failure', runtime: true, editor: true, artifactEntry: 'missing-entry' },
  ]

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const rootDir = await createTemporaryRoot(t, 'flowup-build-failure-')
      await createBuildFixture({ rootDir, ...scenario })
      const distDir = join(rootDir, 'dist')
      await mkdir(join(distDir, 'nested'), { recursive: true })
      await writeFile(join(distDir, 'state.txt'), 'known-good\n', 'utf8')
      await writeFile(join(distDir, 'nested/data.bin'), Buffer.from([0, 1, 2, 255]))
      const before = await snapshotDirectory(distDir)

      await assert.rejects(runBuild({ cwd: rootDir, mode: 'all' }))

      assert.deepEqual(await snapshotDirectory(distDir), before)
    })
  }
})

test('a second package build failure leaves the previous assemble output unchanged', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-second-package-failure-')
  await createBuildFixture({ rootDir: join(rootDir, 'packages/a-node'), scope: 'a-node' })
  await createBuildFixture({
    rootDir: join(rootDir, 'packages/b-node'),
    scope: 'b-node',
    runtime: false,
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(runAssemble({ cwd: rootDir, output: 'output' }))

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('assemble dependency conflicts leave the previous output unchanged', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-dependency-failure-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
    dependencies: { shared: '^1.0.0' },
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-b',
    name: 'node-b-package',
    scope: 'node-b',
    nodes: { 'node-b': 'node-b.js' },
    dependencies: { shared: '^2.0.0' },
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /Dependency version conflict.*shared/,
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('assemble copy failures leave the previous output unchanged', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-copy-failure-')
  const { distDir } = await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
    manifest: false,
  })
  await writeFile(join(distDir, 'resources'), 'not-a-directory\n', 'utf8')
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('invalid artifact manifests leave the previous output unchanged', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-manifest-failure-')
  const { distDir } = await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
  })
  const manifestPath = join(distDir, 'flowup.manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.formatVersion = 999
  await writeJson(manifestPath, manifest)
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /Unsupported Flowup artifact format/,
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('failed atomic replacement restores the previous output', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-commit-failure-')
  const outputDir = join(rootDir, 'dist')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)
  const missingStagingDir = join(rootDir, '.missing-staging')

  await assert.rejects(commitStagedDirectory(missingStagingDir, outputDir))

  assert.deepEqual(await snapshotDirectory(outputDir), before)
  assert.equal(existsSync(join(rootDir, '.dist.flowup-backup')), false)
})

test('creating staging removes stale staging directories without touching output', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-stale-staging-')
  const outputDir = join(rootDir, 'dist')
  const staleDir = join(rootDir, '.dist.flowup-tmp-stale')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  await mkdir(staleDir)
  await writeFile(join(staleDir, 'partial.txt'), 'partial\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  const stagingDir = await createStagingDir(outputDir)
  t.after(async () => rm(stagingDir, { recursive: true, force: true }))

  assert.equal(existsSync(staleDir), false)
  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('build skips symlinked static asset trees', async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-symlink-assets-')
  await createBuildFixture({ rootDir })
  const externalDir = join(rootDir, 'external-assets')
  const resourcesDir = join(rootDir, 'resources')
  await mkdir(externalDir)
  await mkdir(resourcesDir)
  await writeFile(join(externalDir, 'secret.txt'), 'must-not-be-copied\n', 'utf8')
  try {
    await symlink(
      externalDir,
      join(resourcesDir, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
  }
  catch (error) {
    if (error?.code === 'EPERM') {
      t.skip('The current environment does not permit creating symlinks')
      return
    }
    throw error
  }

  await runBuild({ cwd: rootDir, mode: 'all' })

  const distDir = join(rootDir, 'dist')
  assert.equal(existsSync(join(distDir, 'resources/linked/secret.txt')), false)
  const { manifest } = await readFlowupArtifact(distDir)
  assert.deepEqual(manifest.assets.resources, [])
})
