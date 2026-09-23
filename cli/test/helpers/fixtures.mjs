import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { lstat, mkdir, mkdtemp, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFlowupArtifactManifest } from '../../dist/index.js'

export async function createTemporaryRoot(testContext, prefix = 'flowup-test-') {
  const rootDir = await mkdtemp(join(tmpdir(), prefix))
  testContext.after(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })
  return rootDir
}

export async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function createBuiltPackage({
  rootDir,
  directory,
  name,
  scope,
  nodes,
  plugins,
  dependencies,
  peerDependencies,
  optionalDependencies,
  nodeRedVersion,
  nodeRedDependencies,
  files = {},
  resources = {},
  icons = {},
  locales = {},
  manifest = true,
}) {
  const packageDir = resolve(rootDir, directory)
  const distDir = join(packageDir, 'dist')
  const nodeEntries = nodes ?? {}
  const pluginEntries = plugins ?? {}
  const nodeRed = {
    scope,
    version: nodeRedVersion,
    dependencies: nodeRedDependencies,
    nodes: Object.keys(nodeEntries).length ? nodeEntries : undefined,
    plugins: Object.keys(pluginEntries).length ? pluginEntries : undefined,
  }

  await mkdir(distDir, { recursive: true })
  await writeFile(
    join(packageDir, 'flowup.config.js'),
    '// @wry-smile/flowup\nexport default {}\n',
    'utf8',
  )
  await writeJson(join(packageDir, 'package.json'), {
    name: name,
    version: '1.0.0',
    'node-red': {
      ...nodeRed,
      nodes: prefixEntryPaths(nodeRed.nodes),
      plugins: prefixEntryPaths(nodeRed.plugins),
    },
  })
  await writeJson(join(distDir, 'package.json'), {
    name: name,
    version: '1.0.0',
    dependencies: dependencies,
    peerDependencies: peerDependencies,
    optionalDependencies: optionalDependencies,
    'node-red': nodeRed,
  })

  for (const [entryName, entryPath] of Object.entries(nodeEntries)) {
    await writeTextFile(
      join(distDir, entryPath),
      `module.exports = function(RED) { function FixtureNode(config) { RED.nodes.createNode(this, config) } RED.nodes.registerType(${JSON.stringify(entryName)}, FixtureNode) }\n`,
    )
    await writeTextFile(
      join(distDir, entryPath.replace(/\.c?js$/i, '.html')),
      `<script type="text/html" data-template-name="${entryName}"></script>\n`,
    )
  }

  for (const [entryName, entryPath] of Object.entries(pluginEntries)) {
    await writeTextFile(
      join(distDir, entryPath),
      `module.exports = function(RED) { RED.plugins.registerPlugin(${JSON.stringify(entryName)}, { type: 'flowup-test' }) }\n`,
    )
    await writeTextFile(
      join(distDir, entryPath.replace(/\.c?js$/i, '.html')),
      `<script type="text/javascript" data-flowup-plugin="${entryName}"></script>\n`,
    )
  }

  await writeFileMap(distDir, files)
  await writeFileMap(join(distDir, 'resources'), resources)
  await writeFileMap(join(distDir, 'icons'), icons)
  await writeFileMap(join(distDir, 'locales'), locales)

  if (manifest) await writeFlowupArtifactManifest(distDir, 'test')

  return { packageDir, distDir }
}

export async function createBuildFixture({
  rootDir,
  scope = 'fixture-node',
  runtime = true,
  editor = true,
  artifactEntry = scope,
}) {
  const cliEntryUrl = pathToFileURL(resolve(import.meta.dirname, '../../dist/index.js')).href
  await mkdir(rootDir, { recursive: true })
  await writeJson(join(rootDir, 'package.json'), {
    name: `flowup-${scope}`,
    version: '1.0.0',
    type: 'module',
    'node-red': {
      scope,
      nodes: {
        [scope]: `dist/${artifactEntry}.js`,
      },
    },
  })
  await writeFile(
    join(rootDir, 'flowup.config.mjs'),
    `// @wry-smile/flowup\nimport { fileURLToPath } from 'node:url'\nimport { defineConfig } from ${JSON.stringify(cliEntryUrl)}\n\nexport default defineConfig({\n  root: fileURLToPath(new URL('.', import.meta.url)),\n  scope: ${JSON.stringify(scope)},\n  runtime: { entry: 'runtime/index.js' },\n  client: { entry: 'client/index.js', template: 'client/editor.html' },\n})\n`,
    'utf8',
  )
  if (runtime) {
    await writeTextFile(
      join(rootDir, 'runtime/index.js'),
      `export default function(RED) { function FixtureNode(config) { RED.nodes.createNode(this, config) } RED.nodes.registerType(${JSON.stringify(scope)}, FixtureNode) }\n`,
    )
  }
  if (editor) {
    await writeTextFile(join(rootDir, 'client/index.js'), 'globalThis.__flowupFixture = true\n')
    await writeTextFile(
      join(rootDir, 'client/editor.html'),
      `<script type="text/html" data-template-name="${scope}"></script>\n`,
    )
  }
}

export async function snapshotDirectory(rootDir) {
  if (!existsSync(rootDir)) return null

  const entries = []
  await walk(rootDir, rootDir, entries)
  return entries
}

async function walk(rootDir, currentDir, output) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of entries) {
    const absolutePath = join(currentDir, entry.name)
    const relativePath = relative(rootDir, absolutePath).split(sep).join('/')
    const stats = await lstat(absolutePath)
    if (stats.isSymbolicLink()) {
      output.push({ path: relativePath, type: 'symlink', target: await readlink(absolutePath) })
      continue
    }
    if (stats.isDirectory()) {
      output.push({ path: `${relativePath}/`, type: 'directory' })
      await walk(rootDir, absolutePath, output)
      continue
    }
    if (stats.isFile()) {
      const content = await readFile(absolutePath)
      output.push({
        path: relativePath,
        type: 'file',
        size: content.length,
        sha256: createHash('sha256').update(content).digest('hex'),
      })
    }
  }
}

async function writeFileMap(rootDir, files) {
  for (const [filePath, content] of Object.entries(files))
    await writeTextFile(join(rootDir, filePath), content)
}

async function writeTextFile(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

function prefixEntryPaths(entries) {
  if (!entries) return undefined
  return Object.fromEntries(
    Object.entries(entries).map(([name, entryPath]) => [name, `dist/${entryPath}`]),
  )
}
