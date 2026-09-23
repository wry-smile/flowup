import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { runAssemble, runBuild } from '../cli/dist/internal.js'

const execFileAsync = promisify(execFile)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nodeDir = join(rootDir, 'examples/nodes/simple-node')
const pluginDir = join(rootDir, 'examples/plugins/simple-plugin')
const temporaryDir = await mkdtemp(join(tmpdir(), 'flowup-examples-'))
const outputDir = join(temporaryDir, 'assembled')

try {
  await runBuild({ cwd: nodeDir, mode: 'all' })
  await runBuild({ cwd: pluginDir, mode: 'all' })
  const result = await runAssemble({
    cwd: rootDir,
    output: outputDir,
    name: 'flowup-example-assemble',
    packages: ['flowup-simple-node', 'flowup-simple-plugin'],
    skipBuild: true,
  })

  assert.equal(result.packages.length, 2)
  assert.equal(result.manifest['node-red'].nodes['simple-node'], 'simple-node/simple-node.js')
  assert.equal(result.manifest['node-red'].plugins['simple-plugin'], 'simple-plugin/simple-plugin.js')
  assert.match(await readFile(join(outputDir, 'README.md'), 'utf8'), /flowup-simple-node/)
  assert.match(await readFile(join(outputDir, 'LICENSE'), 'utf8'), /MIT License/)

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const { stdout } = await execFileAsync(
    npmCommand,
    ['pack', '--dry-run', '--json'],
    {
      cwd: outputDir,
      env: {
        ...process.env,
        npm_config_cache: join(temporaryDir, 'npm-cache'),
      },
      maxBuffer: 10 * 1024 * 1024,
    },
  )
  const parsedPackResult = JSON.parse(stdout)
  const packResult = Array.isArray(parsedPackResult)
    ? parsedPackResult[0]
    : parsedPackResult.files
      ? parsedPackResult
      : Object.values(parsedPackResult)[0]
  const packedPaths = new Set(packResult.files.map(file => file.path))
  for (const requiredPath of [
    'LICENSE',
    'README.md',
    'package.json',
    'simple-node/simple-node.js',
    'simple-node/simple-node.html',
    'simple-plugin/simple-plugin.js',
  ]) {
    assert.ok(packedPaths.has(requiredPath), `Missing assembled tarball file: ${requiredPath}`)
  }

  console.log(`Verified example build, assemble, and npm pack in ${outputDir}`)
}
finally {
  await rm(temporaryDir, { recursive: true, force: true })
}
