import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import ts from 'typescript'
import { createTemporaryRoot } from './helpers/fixtures.mjs'

const execFileAsync = promisify(execFile)
const cli = resolve(import.meta.dirname, '../dist/bin/flowup.js')

async function gen(cwd, ...args) {
  return execFileAsync(process.execPath, [cli, 'gen', ...args], { cwd })
}

for (const framework of ['preact', 'solid']) {
  test(`${framework} single-entry node and plugin scaffolds`, async t => {
    const root = await createTemporaryRoot(t, `flowup-${framework}-single-`)
    await gen(
      root,
      '--type',
      'node',
      '--name',
      `${framework}-node`,
      '--framework',
      framework,
      '--unocss',
      '--locales',
      'en-US,zh-CN',
      '--non-interactive',
    )
    await gen(
      root,
      '--type',
      'plugin',
      '--name',
      `${framework}-plugin`,
      '--framework',
      framework,
      '--unocss',
      '--locales',
      'en-US,zh-CN',
      '--non-interactive',
    )

    for (const type of ['node', 'plugin']) {
      const dir = join(root, `${framework}-${type}`)
      const packageJson = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
      const client = await readFile(join(dir, 'client/index.tsx'), 'utf8')
      const app = await readFile(join(dir, 'client/App.tsx'), 'utf8')
      assert.match(client, /virtual:uno\.css/)
      assert.doesNotMatch(app, /@jsxImportSource/)
      assert.match(
        await readFile(join(dir, 'tsconfig.app.json'), 'utf8'),
        new RegExp(`"jsxImportSource": "${framework === 'solid' ? 'solid-js' : 'preact'}"`),
      )
      const hydrate = await readFile(join(dir, 'client/hydrate.ts'), 'utf8')
      assert.match(
        hydrate,
        new RegExp(`createClientI18n\\(RED, 'flowup-${framework}-${type}/${framework}-${type}'`),
      )
      assert.match(hydrate, /export const \$t =/)
      assert.match(hydrate, /export const DEFAULT_HYDRATE_STATE/)
      await assert.rejects(readFile(join(dir, 'client/i18n.ts'), 'utf8'))
      assert.ok(packageJson.devDependencies[framework === 'solid' ? 'vite-plugin-solid' : 'preact'])
      assert.match(await readFile(join(dir, 'flowup.config.ts'), 'utf8'), /presetFlowupWind4\(\{ scope \}\)/)
      if (framework === 'preact') assert.ok(packageJson.devDependencies['@preact/preset-vite'])
    }
  })
}

test('mixed multi-entry package keeps config explicit and gives setup instructions', async t => {
  const root = await createTemporaryRoot(t, 'flowup-mixed-multi-')
  await gen(root, 'package', 'mixed-frameworks')
  const dir = join(root, 'mixed-frameworks')
  const preactResult = await gen(
    dir,
    'add',
    'node',
    'preact-node',
    '--framework',
    'preact',
    '--unocss',
  )
  await gen(dir, 'add', 'node', 'solid-node', '--framework', 'solid', '--unocss')
  await gen(dir, 'add', 'plugin', 'solid-plugin', '--framework', 'solid', '--unocss')
  assert.match(preactResult.stdout, /pnpm install/)
  assert.match(preactResult.stdout, /flowup.config.ts/)
  assert.match(preactResult.stdout, /flowup.config.ts updated/)

  const packageJson = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  assert.ok(packageJson.devDependencies.preact)
  assert.ok(packageJson.devDependencies['@preact/preset-vite'])
  assert.ok(packageJson.devDependencies['solid-js'])
  assert.ok(packageJson.devDependencies.unocss)
  assert.ok(packageJson['node-red'].nodes['mixed-frameworks-nodes'])
  assert.ok(packageJson['node-red'].plugins['mixed-frameworks-plugins'])
  for (const path of ['nodes/preact-node', 'nodes/solid-node', 'plugins/solid-plugin']) {
    const client = await readFile(join(dir, path, 'client/index.tsx'), 'utf8')
    assert.match(client, /import ['"]virtual:uno\.css['"]/)
    assert.match(await readFile(join(dir, path, 'tsconfig.json'), 'utf8'), /jsxImportSource/)
    const hydrate = await readFile(join(dir, path, 'client/hydrate.ts'), 'utf8')
    assert.match(
      hydrate,
      new RegExp(
        `createClientI18n\\(RED, 'flowup-mixed-frameworks/mixed-frameworks-${path.startsWith('nodes') ? 'nodes' : 'plugins'}'`,
      ),
    )
    assert.match(hydrate, /export const \$t =/)
    assert.match(hydrate, /export const DEFAULT_HYDRATE_STATE/)
    await assert.rejects(readFile(join(dir, path, 'client/i18n.ts'), 'utf8'))
  }
  const config = await readFile(join(dir, 'flowup.config.ts'), 'utf8')
  assert.doesNotMatch(config, /readdirSync|readFileSync/)
  assert.match(config, /preact\(\{ include:/)
  assert.match(config, /solid\(\{ include:/)
  assert.match(config, /presetFlowupWind4\(\{ scope \}\)/)
  assert.match(config, /@shared/)
  assert.match(packageJson.scripts.typecheck, /nodes\/preact-node\/tsconfig\.json/)
  const parsed = ts.createSourceFile('flowup.config.ts', config, ts.ScriptTarget.Latest, true)
  assert.deepEqual(parsed.parseDiagnostics, [])
})
