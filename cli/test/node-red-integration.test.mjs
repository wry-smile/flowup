/* eslint-disable antfu/no-import-dist, test/no-import-node-test */
import assert from 'node:assert/strict'
import { cp, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { runAssemble } from '../dist/index.js'
import {
  createBuiltPackage,
  createTemporaryRoot,
  writeJson,
} from './helpers/fixtures.mjs'

test('assembled resources, editor config, locales, and icons load in real Node-RED', {
  skip: process.env.FLOWUP_SKIP_NODE_RED_INTEGRATION
    ? 'FLOWUP_SKIP_NODE_RED_INTEGRATION is set'
    : false,
  timeout: 60_000,
}, async (t) => {
  const rootDir = await createTemporaryRoot(t, 'flowup-node-red-')
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-a',
    name: 'node-a-package',
    scope: 'node-a',
    nodes: { 'node-a': 'node-a.js' },
    files: {
      'node-a.html': [
        '<script type="text/html" data-template-name="node-a"></script>',
        '<div data-flowup="node-a">',
        '<a href="/resources/node-a-package/shared.txt">resource</a>',
        '<a href="resources/node-a-package/shared.txt">relative resource</a>',
        '<a href="__FLOWUP_RESOURCE_BASE__/shared.txt">placeholder resource</a>',
        '</div>',
        '',
      ].join('\n'),
    },
    resources: { 'shared.txt': 'resource-from-node-a\n' },
    icons: { 'node-a.svg': '<svg xmlns="http://www.w3.org/2000/svg"><title>node-a-icon</title></svg>\n' },
    locales: {
      'en-US/node-a.json': JSON.stringify({ label: 'Flowup Node A Locale' }),
    },
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/node-b',
    name: 'node-b-package',
    scope: 'node-b',
    nodes: { 'node-b': 'node-b.js' },
    resources: { 'shared.txt': 'resource-from-node-b\n' },
  })
  await createBuiltPackage({
    rootDir,
    directory: 'packages/plugin-a',
    name: '@flowup-test/plugin-a-package',
    scope: 'plugin-a',
    plugins: { 'plugin-a': 'plugin-a.js' },
  })

  const assembleName = '@flowup-test/assembled'
  const result = await runAssemble({
    cwd: rootDir,
    output: 'output',
    name: assembleName,
    skipBuild: true,
  })
  const { distDir: standaloneDistDir } = await createBuiltPackage({
    rootDir,
    directory: 'standalone/single-node',
    name: 'single-node-package',
    scope: 'single-node',
    nodes: { 'single-node': 'single-node.js' },
    resources: { 'single.txt': 'resource-from-single-package\n' },
  })
  const userDir = join(rootDir, 'node-red-user')
  const installedPackageDir = join(userDir, 'node_modules', '@flowup-test', 'assembled')
  await mkdir(dirname(installedPackageDir), { recursive: true })
  await cp(result.outputDir, installedPackageDir, { recursive: true })
  await cp(
    standaloneDistDir,
    join(userDir, 'node_modules', 'single-node-package'),
    { recursive: true },
  )
  await writeJson(join(userDir, 'package.json'), {
    name: 'flowup-node-red-integration',
    version: '1.0.0',
    private: true,
    dependencies: {
      [assembleName]: '1.0.0',
      'single-node-package': '1.0.0',
    },
  })

  const { RED, express } = await loadNodeRed()
  const app = express()
  const server = createServer(app)
  RED.init(server, {
    userDir,
    flowFile: 'flows.json',
    credentialSecret: false,
    httpAdminRoot: '/',
    httpNodeRoot: '/api',
    logging: {
      console: {
        level: 'off',
        metrics: false,
        audit: false,
      },
    },
    editorTheme: {
      projects: { enabled: false },
    },
  })
  app.use('/', RED.httpAdmin)
  app.use('/api', RED.httpNode)

  try {
    await listen(server)
  }
  catch (error) {
    if (error?.code === 'EPERM') {
      if (process.env.FLOWUP_REQUIRE_NODE_RED_INTEGRATION)
        throw error
      t.skip('The current environment does not permit binding a local HTTP port')
      return
    }
    throw error
  }
  t.after(async () => {
    await RED.stop()
    await closeServer(server)
  })
  await RED.start()

  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const baseUrl = `http://127.0.0.1:${address.port}`

  assert.equal(typeof RED.nodes.getType('node-a'), 'function')
  assert.equal(typeof RED.nodes.getType('node-b'), 'function')
  assert.equal(typeof RED.nodes.getType('single-node'), 'function')

  const nodeList = await fetchJson(`${baseUrl}/nodes`, {
    headers: { accept: 'application/json' },
  })
  assert.ok(nodeList.some(node => node.module === assembleName))

  const editorConfig = await fetchText(`${baseUrl}/nodes/${assembleName}/node-a`)
  assert.match(editorConfig, /data-flowup="node-a"/)
  assert.match(
    editorConfig,
    /\/resources\/@flowup-test\/assembled\/node-a\/shared\.txt/,
  )
  assert.match(
    editorConfig,
    /resources\/@flowup-test\/assembled\/node-a\/shared\.txt/,
  )
  assert.equal(
    editorConfig.match(/resources\/@flowup-test\/assembled\/node-a\/shared\.txt/g)?.length,
    3,
  )

  const pluginList = await fetchJson(`${baseUrl}/plugins`, {
    headers: { accept: 'application/json' },
  })
  assert.ok(pluginList.some(plugin => (
    plugin.module === assembleName && plugin.name === 'plugin-a'
  )))
  const pluginConfig = await fetchText(`${baseUrl}/plugins/${assembleName}/plugin-a`)
  assert.match(pluginConfig, /data-flowup-plugin="plugin-a"/)

  const messages = await fetchJson(
    `${baseUrl}/nodes/${assembleName}/node-a/messages?lng=en-US`,
  )
  assert.equal(messages.label, 'Flowup Node A Locale')

  const icon = await fetchText(`${baseUrl}/icons/${assembleName}/node-a.svg`)
  assert.match(icon, /node-a-icon/)

  assert.equal(
    await fetchText(`${baseUrl}/resources/${assembleName}/node-a/shared.txt`),
    'resource-from-node-a\n',
  )
  assert.equal(
    await fetchText(`${baseUrl}/resources/${assembleName}/node-b/shared.txt`),
    'resource-from-node-b\n',
  )
  assert.equal(
    await fetchText(`${baseUrl}/resources/single-node-package/single.txt`),
    'resource-from-single-package\n',
  )
})

async function loadNodeRed() {
  const defaultRequire = createRequire(import.meta.url)
  const configuredModule = process.env.FLOWUP_NODE_RED_MODULE
  const nodeRedEntry = configuredModule
    ? defaultRequire.resolve(resolve(configuredModule))
    : defaultRequire.resolve('node-red')
  const nodeRedRequire = createRequire(nodeRedEntry)
  const imported = await import(pathToFileURL(nodeRedEntry).href)
  return {
    RED: imported.default ?? imported,
    express: nodeRedRequire('express'),
  }
}

async function fetchText(url, options) {
  const response = await fetch(url, options)
  assert.equal(response.status, 200, `${url} returned ${response.status}`)
  return response.text()
}

async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options))
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
}

async function closeServer(server) {
  if (!server.listening)
    return
  await new Promise((resolveClose, reject) => {
    server.close(error => error ? reject(error) : resolveClose())
  })
}
