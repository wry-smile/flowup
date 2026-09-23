import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  assertSafeAssembleOutput,
  commitStagedDirectory,
  createStagingDir,
  normalizeArtifactPath,
  readFlowupArtifact,
  runAssemble,
  writeFlowupArtifactManifest,
} from '../dist/index.js'

test('assemble output rejects both parent and child overlap with a source package', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'flowup-safe-path-'))
  const packageDir = join(rootDir, 'packages', 'node-a')
  await mkdir(join(packageDir, 'runtime'), { recursive: true })

  await assert.rejects(
    assertSafeAssembleOutput(join(packageDir, 'runtime'), [packageDir]),
    /overlaps source package/,
  )
  await assert.rejects(assertSafeAssembleOutput(rootDir, [packageDir]), /overlaps source package/)
  await assert.doesNotReject(assertSafeAssembleOutput(join(rootDir, 'output'), [packageDir]))

  await rm(rootDir, { recursive: true, force: true })
})

test('staged directory replaces output only when committed', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'flowup-staging-'))
  const outputDir = join(rootDir, 'dist')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'old', 'utf8')

  const stagingDir = await createStagingDir(outputDir)
  await writeFile(join(stagingDir, 'state.txt'), 'new', 'utf8')

  assert.equal(await readFile(join(outputDir, 'state.txt'), 'utf8'), 'old')
  await commitStagedDirectory(stagingDir, outputDir)
  assert.equal(await readFile(join(outputDir, 'state.txt'), 'utf8'), 'new')
  assert.equal(existsSync(stagingDir), false)

  await rm(rootDir, { recursive: true, force: true })
})

test('creating a staging directory recovers an interrupted output backup', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'flowup-recovery-'))
  const outputDir = join(rootDir, 'dist')
  const backupDir = join(rootDir, '.dist.flowup-backup')
  await mkdir(backupDir)
  await writeFile(join(backupDir, 'state.txt'), 'recoverable', 'utf8')

  const stagingDir = await createStagingDir(outputDir)
  assert.equal(await readFile(join(outputDir, 'state.txt'), 'utf8'), 'recoverable')
  assert.equal(existsSync(backupDir), false)

  await rm(stagingDir, { recursive: true, force: true })
  await rm(rootDir, { recursive: true, force: true })
})

test('artifact manifest validates entries and rejects path traversal', async () => {
  const distDir = await mkdtemp(join(tmpdir(), 'flowup-artifact-'))
  await writeFile(join(distDir, 'node-a.js'), 'module.exports = () => {}\n', 'utf8')
  await writeFile(join(distDir, 'node-a.html'), '<script></script>\n', 'utf8')
  await writeFile(
    join(distDir, 'package.json'),
    JSON.stringify({
      name: 'node-red-node-a',
      version: '1.0.0',
      dependencies: { example: '^1.0.0' },
      'node-red': {
        nodes: {
          'node-a': 'node-a.js',
        },
      },
    }),
    'utf8',
  )

  const written = await writeFlowupArtifactManifest(distDir, 'test')
  const loaded = await readFlowupArtifact(distDir)
  assert.deepEqual(loaded.manifest, written)
  assert.deepEqual(loaded.manifest.runtime.externalDependencies, ['example'])
  assert.throws(() => normalizeArtifactPath('../secret.js', 'entry'), /inside the package/)
  assert.throws(() => normalizeArtifactPath('/secret.js', 'entry'), /inside the package/)

  await rm(distDir, { recursive: true, force: true })
})

test('assemble reads built metadata and preserves nested entry paths', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'flowup-assemble-'))
  const packageDir = join(rootDir, 'packages', 'node-a')
  const distDir = join(packageDir, 'dist')
  const outputDir = join(rootDir, 'output')
  await mkdir(join(distDir, 'nodes'), { recursive: true })
  await mkdir(join(distDir, 'resources'), { recursive: true })
  await writeFile(join(packageDir, 'flowup.config.js'), '// @wry-smile/flowup\n', 'utf8')
  await writeFile(
    join(packageDir, 'package.json'),
    JSON.stringify({
      name: 'node-red-node-a-source',
      version: '0.1.0',
      'node-red': {
        scope: 'node-a',
        nodes: {
          'node-a': 'dist/nodes/node-a.js',
        },
      },
    }),
    'utf8',
  )
  await writeFile(
    join(distDir, 'package.json'),
    JSON.stringify({
      name: 'node-red-node-a-built',
      version: '1.2.3',
      dependencies: {
        example: '^2.0.0',
      },
      'node-red': {
        nodes: {
          'node-a': 'nodes/node-a.js',
        },
      },
    }),
    'utf8',
  )
  await writeFile(join(distDir, 'nodes', 'node-a.js'), 'module.exports = () => {}\n', 'utf8')
  await writeFile(
    join(distDir, 'nodes', 'node-a.html'),
    '<script></script><img src="resources/node-red-node-a-built/asset.txt">\n',
    'utf8',
  )
  await writeFile(join(distDir, 'resources', 'asset.txt'), 'asset\n', 'utf8')
  await writeFlowupArtifactManifest(distDir, 'test')

  const result = await runAssemble({
    cwd: rootDir,
    output: 'output',
    name: 'node-red-assembled-test',
    skipBuild: true,
  })

  assert.deepEqual(result.manifest.dependencies, { example: '^2.0.0' })
  assert.equal(result.manifest['node-red'].nodes['node-a'], 'node-a/nodes/node-a.js')
  assert.equal(existsSync(join(outputDir, 'node-a', 'nodes', 'node-a.js')), true)
  assert.equal(existsSync(join(outputDir, 'resources', 'node-a', 'asset.txt')), true)
  assert.match(
    await readFile(join(outputDir, 'node-a', 'nodes', 'node-a.html'), 'utf8'),
    /resources\/node-red-assembled-test\/node-a\/asset\.txt/,
  )

  await rm(rootDir, { recursive: true, force: true })
})
