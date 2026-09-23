import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import test from 'node:test'
import { normalizeArtifactPath, readFlowupArtifact, runAssemble } from '../dist/internal.js'
import { createBuiltPackage, createTemporaryRoot, snapshotDirectory } from './helpers/fixtures.mjs'

test('assemble preserves nested entries and merges supported dependency groups', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-assemble-boundaries-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: {
      'node-a': 'nodes/node-a.js',
      'node-a-helper': 'nodes/nested/helper.js',
    },
    dependencies: { runtime: '^1.0.0' },
    peerDependencies: { peer: '^2.0.0' },
    optionalDependencies: { optional: '^3.0.0' },
    nodeRedVersion: '>=4.0.0',
    nodeRedDependencies: ['node-b'],
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/plugin-a',
    name: 'plugin-a-package',
    scope: 'plugin-a',
    plugins: { 'plugin-a': 'plugins/nested/plugin-a.js' },
    dependencies: { runtime: '^1.0.0' },
    nodeRedVersion: '>=4.0.0',
  })

  const result = await runAssemble({
    cwd: rootDir,
    output: 'output',
    name: 'assembled-boundaries',
    skipBuild: true,
  })

  assert.deepEqual(result.manifest.dependencies, { runtime: '^1.0.0' })
  assert.deepEqual(result.manifest.peerDependencies, { peer: '^2.0.0' })
  assert.deepEqual(result.manifest.optionalDependencies, { optional: '^3.0.0' })
  assert.deepEqual(result.manifest['node-red'].dependencies, ['node-b'])
  assert.equal(result.manifest['node-red'].version, '>=4.0.0')
  assert.equal(result.manifest['node-red'].nodes['node-a'], 'node-a/nodes/node-a.js')
  assert.equal(result.manifest['node-red'].nodes['node-a-helper'], 'node-a/nodes/nested/helper.js')
  assert.equal(
    result.manifest['node-red'].plugins['plugin-a'],
    'plugin-a/plugins/nested/plugin-a.js',
  )
  assert.equal(existsSync(join(result.outputDir, 'node-a/nodes/nested/helper.js')), true)
  assert.equal(existsSync(join(result.outputDir, 'plugin-a/plugins/nested/plugin-a.js')), true)
})

test('duplicate node entries are rejected before replacing output', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-duplicate-entry-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { duplicate: 'node-a.js' },
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-b',
    name: 'node-b-package',
    scope: 'node-b',
    nodes: { duplicate: 'node-b.js' },
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /Duplicate node entry "duplicate"/,
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('unsafe component directory names are rejected before any output mutation', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-unsafe-component-dir-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: '..',
    nodes: { 'node-a': 'node-a.js' },
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /safe assemble directory name/,
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('package filters require every requested package and accept portable separators', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-package-filter-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-b',
    name: 'node-b-package',
    scope: 'node-b',
    nodes: { 'node-b': 'node-b.js' },
  })

  const result = await runAssemble({
    cwd: rootDir,
    output: 'output',
    packages: ['packages\\node-a'],
    skipBuild: true,
  })
  assert.deepEqual(Object.keys(result.manifest['node-red'].nodes), ['node-a'])

  await assert.rejects(
    runAssemble({
      cwd: rootDir,
      output: 'missing-output',
      packages: ['node-a-package', 'missing-package'],
      skipBuild: true,
    }),
    /Requested Flowup package\(s\) not found: missing-package/,
  )
})

test('legacy artifacts without a Flowup manifest remain readable', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-legacy-artifact-')
  const { distDir } = await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
    dependencies: { runtime: '^1.0.0' },
    manifest: false,
  })

  const artifact = await readFlowupArtifact(distDir)
  assert.equal(artifact.manifest.flowupVersion, 'legacy')
  assert.deepEqual(artifact.manifest.runtime.externalDependencies, ['runtime'])

  const result = await runAssemble({ cwd: rootDir, output: 'output', skipBuild: true })
  assert.equal(result.manifest['node-red'].nodes['node-a'], 'node-a/node-a.js')
})

test('malformed dist package metadata fails deterministically', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-malformed-package-')
  const { distDir } = await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
  })
  await writeFile(join(distDir, 'package.json'), '{ invalid json', 'utf8')

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /Unable to read JSON file.*package\.json/,
  )
})

test('non-publishable dependency protocols are rejected before assemble output changes', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-dependency-protocol-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
    dependencies: { internal: 'workspace:*' },
    manifest: false,
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(outputDir)
  await writeFile(join(outputDir, 'state.txt'), 'known-good\n', 'utf8')
  const before = await snapshotDirectory(outputDir)

  await assert.rejects(
    runAssemble({ cwd: rootDir, output: 'output', skipBuild: true }),
    /Non-publishable dependency range.*workspace:\*/,
  )

  assert.deepEqual(await snapshotDirectory(outputDir), before)
})

test('--no-clean preserves unrelated files and replaces the selected component directory', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-no-clean-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
  })
  const outputDir = join(rootDir, 'output')
  await mkdir(join(outputDir, 'node-a'), { recursive: true })
  await writeFile(join(outputDir, 'keep.txt'), 'keep\n', 'utf8')
  await writeFile(join(outputDir, 'node-a/stale.txt'), 'stale\n', 'utf8')

  await runAssemble({
    cwd: rootDir,
    output: 'output',
    clean: false,
    skipBuild: true,
  })

  assert.equal(await readFile(join(outputDir, 'keep.txt'), 'utf8'), 'keep\n')
  assert.equal(existsSync(join(outputDir, 'node-a/stale.txt')), false)
  assert.equal(existsSync(join(outputDir, 'node-a/node-a.js')), true)
})

test('artifact paths reject POSIX, Windows drive, UNC, and traversal paths', () => {
  assert.equal(normalizeArtifactPath('nested\\node.js', 'entry'), 'nested/node.js')
  assert.throws(() => normalizeArtifactPath('/tmp/node.js', 'entry'), /inside the package/)
  assert.throws(() => normalizeArtifactPath('C:\\temp\\node.js', 'entry'), /inside the package/)
  assert.throws(
    () => normalizeArtifactPath('\\\\server\\share\\node.js', 'entry'),
    /inside the package/,
  )
  assert.throws(() => normalizeArtifactPath('nested/../../node.js', 'entry'), /inside the package/)
})

test('default assemble output falls back outside a source dist on every platform', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-default-output-')
  await createBuiltPackage({
    rootDir,
    directory: '.',
    name: 'root-node-package',
    scope: 'root-node',
    nodes: { 'root-node': 'root-node.js' },
  })
  const expectedOutput = join(dirname(rootDir), `${basename(rootDir)}-flowup-assemble`)
  t.after(async () => rm(expectedOutput, { recursive: true, force: true }))

  const result = await runAssemble({ cwd: rootDir, skipBuild: true })

  assert.equal(result.outputDir, expectedOutput)
  assert.equal(existsSync(join(expectedOutput, 'root-node/root-node.js')), true)
})

test('assemble resolves configured cwd relative to its config file', async t => {
  const rootDir = await createTemporaryRoot(t, 'flowup-configured-cwd-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
  })
  const configPath = join(rootDir, 'flowup.config.mjs')
  await writeFile(
    configPath,
    "export default { assemble: { cwd: 'packages', output: 'assembled', skipBuild: true } }\n",
    'utf8',
  )

  const result = await runAssemble({ config: configPath })

  assert.equal(result.rootDir, join(rootDir, 'packages'))
  assert.equal(result.outputDir, join(rootDir, 'packages/assembled'))
  assert.equal(existsSync(join(result.outputDir, 'node-a/node-a.js')), true)
})
