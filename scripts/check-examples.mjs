import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { runAssemble, runBuild } from '../cli/dist/internal.js'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nodeDir = join(rootDir, 'examples/simple-node')
const pluginDir = join(rootDir, 'examples/simple-plugin')
const galleryDir = join(rootDir, 'examples/framework-gallery')
const temporaryDir = await mkdtemp(join(tmpdir(), 'flowup-examples-'))
const outputDir = join(temporaryDir, 'assembled')

try {
  await runBuild({ cwd: nodeDir, mode: 'all' })
  await runBuild({ cwd: pluginDir, mode: 'all' })
  await runBuild({ cwd: galleryDir, mode: 'all' })
  const nodeHtml = await readFile(join(galleryDir, 'dist/framework-gallery-nodes.html'), 'utf8')
  for (const name of ['vanilla-node', 'vue-node', 'svelte-node', 'preact-node', 'solid-node']) {
    assert.match(nodeHtml, new RegExp(`framework-gallery-${name}`))
    const icon = name.split('-')[0]
    assert.match(await readFile(join(galleryDir, `dist/icons/${name}-${icon}.svg`), 'utf8'), /<svg/)
    assert.match(
      await readFile(join(galleryDir, `dist/resources/${name}/badge.svg`), 'utf8'),
      /<svg/,
    )
    assert.match(
      await readFile(join(galleryDir, `dist/resources/${name}/example.json`), 'utf8'),
      /"features"/,
    )
  }
  assert.match(nodeHtml, /data-flowup-scope="framework-gallery"/)
  const groupedMessages = JSON.parse(
    await readFile(join(galleryDir, 'dist/locales/zh-CN/framework-gallery-nodes.json'), 'utf8'),
  )
  assert.equal(groupedMessages['framework-gallery-vanilla-node'].label.name, '名称')
  assert.match(
    await readFile(join(galleryDir, 'dist/locales/en-US/framework-gallery-nodes.html'), 'utf8'),
    /framework-gallery-solid-node/,
  )
  for (const utility of [
    'bg-sky-100',
    'bg-indigo-50',
    'bg-rose-50',
    'bg-amber-50',
    'hover\\:bg-sky-700',
    'dark\\:bg-slate-900',
    'sm\\:grid-cols-2',
  ]) {
    assert.ok(nodeHtml.includes(utility), `Missing generated utility: ${utility}`)
  }
  assert.match(
    await readFile(join(galleryDir, 'dist/framework-gallery-plugins.html'), 'utf8'),
    /framework-gallery-gallery-plugin/,
  )
  assert.match(
    await readFile(join(galleryDir, 'dist/icons/gallery-plugin-gallery.svg'), 'utf8'),
    /<svg/,
  )
  assert.deepEqual((await readdir(join(galleryDir, 'dist/locales/zh-CN'))).sort(), [
    'framework-gallery-nodes.html',
    'framework-gallery-nodes.json',
    'framework-gallery-plugins.json',
  ])
  assert.match(
    await readFile(join(galleryDir, 'dist/locales/zh-CN/framework-gallery-plugins.json'), 'utf8'),
    /framework-gallery-gallery-plugin/,
  )
  const registered = new Map()
  require(join(galleryDir, 'dist/framework-gallery-nodes.js'))({
    nodes: {
      registerType(name, constructor) {
        registered.set(name, constructor)
      },
      createNode() {},
    },
  })
  assert.equal(registered.size, 5)
  const handlers = new Map()
  const instance = {
    on(event, handler) {
      handlers.set(event, handler)
    },
  }
  registered.get('framework-gallery-preact-node').call(instance, { name: 'sample' })
  let sent
  handlers.get('input')(
    { payload: 'hello' },
    message => {
      sent = message
    },
    () => {},
  )
  assert.equal(sent.payload.payload, 'hello')
  assert.equal(sent.payload.framework, 'preact')
  assert.match(sent.payload.traceId, /^[\w-]{8}$/)
  assert.ok(Number.isFinite(Date.parse(sent.payload.receivedAt)))
  const result = await runAssemble({
    cwd: rootDir,
    output: outputDir,
    name: 'flowup-example-assemble',
    packages: ['flowup-simple-node', 'flowup-simple-plugin'],
    skipBuild: true,
  })

  assert.equal(result.packages.length, 2)
  assert.equal(result.manifest['node-red'].nodes['simple-node'], 'simple-node/simple-node.js')
  assert.equal(
    result.manifest['node-red'].plugins['simple-plugin'],
    'simple-plugin/simple-plugin.js',
  )
  assert.match(await readFile(join(outputDir, 'README.md'), 'utf8'), /flowup-simple-node/)
  assert.match(await readFile(join(outputDir, 'LICENSE'), 'utf8'), /MIT License/)

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const { stdout } = await execFileAsync(npmCommand, ['pack', '--dry-run', '--json'], {
    cwd: outputDir,
    env: {
      ...process.env,
      npm_config_cache: join(temporaryDir, 'npm-cache'),
    },
    maxBuffer: 10 * 1024 * 1024,
  })
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
} finally {
  await rm(temporaryDir, { recursive: true, force: true })
}
