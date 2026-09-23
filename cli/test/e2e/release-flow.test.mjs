import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createTemporaryRoot, writeJson } from '../helpers/fixtures.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const cliDir = join(repositoryRoot, 'cli')
const probeScript = join(repositoryRoot, 'cli/test/helpers/node-red-probe.mjs')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

test(
  'published CLI drives gen, build, assemble, pack, install, and Node-RED load',
  {
    skip: process.env.FLOWUP_SKIP_RELEASE_E2E ? 'FLOWUP_SKIP_RELEASE_E2E is set' : false,
    timeout: 240_000,
  },
  async t => {
    const rootDir = await createTemporaryRoot(t, 'flowup-release-e2e-')
    const packDir = join(rootDir, 'packs')
    const consumerDir = join(rootDir, 'consumer')
    const componentsDir = join(consumerDir, 'components')
    const previousNpmCache = process.env.npm_config_cache
    process.env.npm_config_cache = join(rootDir, 'npm-cache')
    t.after(() => {
      if (previousNpmCache === undefined) delete process.env.npm_config_cache
      else process.env.npm_config_cache = previousNpmCache
    })
    await mkdir(packDir, { recursive: true })
    await mkdir(componentsDir, { recursive: true })

    const cliPack = await packPackage(cliDir, packDir)
    assertTarballFiles(cliPack, [
      'LICENSE',
      'README.md',
      'dist/bin/flowup.js',
      'dist/index.d.ts',
      'dist/index.js',
      'package.json',
      'skills/flowup-consumer/SKILL.md',
    ])

    await writeJson(join(consumerDir, 'package.json'), {
      name: 'flowup-release-e2e-consumer',
      version: '1.0.0',
      private: true,
    })
    await run(npmCommand, installArguments(cliPack.tarball), { cwd: consumerDir })

    const flowupBin = join(
      consumerDir,
      'node_modules/.bin',
      process.platform === 'win32' ? 'flowup.cmd' : 'flowup',
    )
    assert.equal(existsSync(flowupBin), true)

    await run(
      flowupBin,
      [
        'gen',
        '--type',
        'node',
        '--name',
        'e2e-node',
        '--locales',
        'en-US',
        '--framework',
        'vanilla',
        '--non-interactive',
      ],
      { cwd: componentsDir },
    )
    await run(
      flowupBin,
      [
        'gen',
        '--type',
        'plugin',
        '--name',
        'e2e-plugin',
        '--locales',
        'en-US',
        '--non-interactive',
      ],
      { cwd: componentsDir },
    )

    const nodeDir = join(componentsDir, 'e2e-node')
    const pluginDir = join(componentsDir, 'e2e-plugin')
    await writeFile(join(nodeDir, 'resources/e2e.txt'), 'e2e-node-resource\n', 'utf8')
    await appendFile(
      join(nodeDir, 'client/editor.html'),
      '<a data-e2e-resource href="resources/flowup-e2e-node/e2e.txt">resource</a>\n',
      'utf8',
    )

    await run(flowupBin, ['build'], { cwd: nodeDir })
    await run(flowupBin, ['build'], { cwd: pluginDir })
    assert.equal(existsSync(join(nodeDir, 'dist/flowup.manifest.json')), true)
    assert.equal(existsSync(join(pluginDir, 'dist/flowup.manifest.json')), true)

    await assertGeneratedMetadata(nodeDir, 'node-red-node')
    await assertGeneratedMetadata(pluginDir, 'node-red-plugin')

    const componentPackDir = join(packDir, 'components')
    await mkdir(componentPackDir)
    const nodePack = await packPackage(nodeDir, componentPackDir)
    const pluginPack = await packPackage(pluginDir, componentPackDir)
    assertTarballFiles(nodePack, [
      'LICENSE',
      'README.md',
      'dist/e2e-node.html',
      'dist/e2e-node.js',
      'dist/flowup.manifest.json',
      'package.json',
      'resources/e2e.txt',
    ])
    assertTarballFiles(pluginPack, [
      'LICENSE',
      'README.md',
      'dist/e2e-plugin.js',
      'dist/flowup.manifest.json',
      'package.json',
    ])

    await run(
      flowupBin,
      [
        'assemble',
        '--cwd',
        consumerDir,
        '--output',
        'assembled',
        '--name',
        '@flowup-e2e/assembled',
        '--skip-build',
      ],
      { cwd: consumerDir },
    )
    const assembledDir = join(consumerDir, 'assembled')
    const assembledPack = await packPackage(assembledDir, join(packDir, 'assembled'))
    assertTarballFiles(assembledPack, [
      'LICENSE',
      'README.md',
      'e2e-node/e2e-node.html',
      'e2e-node/e2e-node.js',
      'e2e-plugin/e2e-plugin.js',
      'package.json',
      'resources/e2e-node/e2e.txt',
    ])

    const singleUserDir = join(rootDir, 'node-red-single')
    await installNodeRedPackages(singleUserDir, [nodePack.tarball, pluginPack.tarball])
    await runNodeRedProbe(rootDir, 'single-probe.json', {
      userDir: singleUserDir,
      nodes: ['e2e-node'],
      plugins: ['e2e-plugin'],
      requests: [
        {
          path: '/nodes/flowup-e2e-node/e2e-node',
          includes: 'data-e2e-resource',
        },
        {
          path: '/resources/flowup-e2e-node/e2e.txt',
          includes: 'e2e-node-resource',
        },
        {
          path: '/plugins/flowup-e2e-plugin/e2e-plugin',
          includes: 'RED.plugins.registerPlugin',
        },
      ],
    })

    const assembledUserDir = join(rootDir, 'node-red-assembled')
    await installNodeRedPackages(assembledUserDir, [assembledPack.tarball])
    await runNodeRedProbe(rootDir, 'assembled-probe.json', {
      userDir: assembledUserDir,
      nodes: ['e2e-node'],
      plugins: ['e2e-plugin'],
      requests: [
        {
          path: '/nodes/@flowup-e2e/assembled/e2e-node',
          includes: 'resources/@flowup-e2e/assembled/e2e-node/e2e.txt',
        },
        {
          path: '/resources/@flowup-e2e/assembled/e2e-node/e2e.txt',
          includes: 'e2e-node-resource',
        },
        {
          path: '/plugins/@flowup-e2e/assembled/e2e-plugin',
          includes: 'RED.plugins.registerPlugin',
        },
      ],
    })
  },
)

async function packPackage(packageDir, packDir) {
  await mkdir(packDir, { recursive: true })
  const { stdout } = await run(npmCommand, ['pack', '--json', '--pack-destination', packDir], {
    cwd: packageDir,
  })
  const parsedResult = JSON.parse(stdout)
  const result = Array.isArray(parsedResult)
    ? parsedResult[0]
    : parsedResult.files
      ? parsedResult
      : Object.values(parsedResult)[0]
  assert.ok(result?.filename, `npm pack returned no filename for ${packageDir}`)
  return {
    ...result,
    tarball: join(packDir, result.filename),
  }
}

function assertTarballFiles(packResult, requiredPaths) {
  const paths = new Set(packResult.files.map(file => file.path))
  for (const requiredPath of requiredPaths)
    assert.ok(paths.has(requiredPath), `Missing ${requiredPath} in ${packResult.filename}`)
}

async function assertGeneratedMetadata(packageDir, expectedKeyword) {
  const packageJson = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
  assert.equal(packageJson.license, 'MIT')
  assert.ok(packageJson.description)
  assert.ok(packageJson.keywords.includes('node-red'))
  assert.ok(packageJson.keywords.includes(expectedKeyword))
  assert.match(await readFile(join(packageDir, 'LICENSE'), 'utf8'), /MIT License/)
}

async function installNodeRedPackages(userDir, tarballs) {
  await mkdir(userDir, { recursive: true })
  await writeJson(join(userDir, 'package.json'), {
    name: `flowup-e2e-${userDir.endsWith('single') ? 'single' : 'assembled'}`,
    version: '1.0.0',
    private: true,
  })
  await run(npmCommand, installArguments(...tarballs), { cwd: userDir })
}

function installArguments(...packages) {
  return [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-package-lock',
    '--save-exact',
    ...packages,
  ]
}

async function runNodeRedProbe(rootDir, fileName, config) {
  const configPath = join(rootDir, fileName)
  await writeJson(configPath, config)
  const { stdout } = await run(process.execPath, [probeScript, configPath], {
    cwd: repositoryRoot,
  })
  const result = JSON.parse(stdout.trim())
  assert.ok(result.nodeRedVersion)
}

async function run(command, args, options) {
  try {
    return await execFileAsync(command, args, {
      ...options,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
      maxBuffer: 20 * 1024 * 1024,
    })
  } catch (error) {
    const details = [error.message, error.stdout, error.stderr].filter(Boolean).join('\n')
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${details}`, { cause: error })
  }
}
