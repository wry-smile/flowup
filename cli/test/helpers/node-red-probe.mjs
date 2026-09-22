import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const configPath = process.argv[2]
if (!configPath)
  throw new Error('Expected a probe config path.')

const config = JSON.parse(await readFile(resolve(configPath), 'utf8'))
const { RED, express } = await loadNodeRed()
const app = express()
const server = createServer(app)
let started = false

try {
  RED.init(server, {
    userDir: resolve(config.userDir),
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
  await listen(server)
  await RED.start()
  started = true

  for (const nodeType of config.nodes ?? [])
    assert.equal(typeof RED.nodes.getType(nodeType), 'function', `Node type not loaded: ${nodeType}`)

  if (config.plugins?.length) {
    const pluginList = await fetchJson(createUrl(server, '/plugins'), {
      headers: { accept: 'application/json' },
    })
    for (const pluginName of config.plugins) {
      assert.ok(
        pluginList.some(plugin => plugin.name === pluginName),
        `Plugin not loaded: ${pluginName}`,
      )
    }
  }

  for (const request of config.requests ?? []) {
    const response = await fetch(createUrl(server, request.path), {
      headers: request.accept ? { accept: request.accept } : undefined,
    })
    assert.equal(response.status, 200, `${request.path} returned ${response.status}`)
    const body = await response.text()
    if (request.includes)
      assert.ok(body.includes(request.includes), `${request.path} did not include ${request.includes}`)
  }

  console.log(JSON.stringify({
    nodeRedVersion: RED.version(),
    nodes: config.nodes ?? [],
    plugins: config.plugins ?? [],
    requests: config.requests?.length ?? 0,
  }))
}
finally {
  if (started)
    await RED.stop()
  await closeServer(server)
}

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

function createUrl(server, pathname) {
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  return `http://127.0.0.1:${address.port}${pathname}`
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  assert.equal(response.status, 200, `${url} returned ${response.status}`)
  return response.json()
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
