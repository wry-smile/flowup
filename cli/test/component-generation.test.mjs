import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { createGenerator } from '@unocss/core'
import { presetFlowupWind4 } from '../dist/index.js'
import { createTemporaryRoot } from './helpers/fixtures.mjs'

const execFileAsync = promisify(execFile)
const cli = resolve(import.meta.dirname, '../dist/bin/flowup.js')

async function gen(cwd, ...args) {
  return execFileAsync(process.execPath, [cli, 'gen', ...args], { cwd })
}

test('Flowup Wind4 resolves CSS variables and keeps the original scoped class', async () => {
  const uno = await createGenerator({ presets: [presetFlowupWind4({ scope: 'demo' })] })
  for (const token of [
    'bg-(--fui-surface)',
    'hover:text-(--fui-accent)',
    'peer-focus-visible:ring-(--fui-focus)/40',
    'rounded-(--fui-radius)',
  ]) {
    const result = await uno.generate(token)
    assert.ok(result.matched.has(token), `${token} should match`)
    assert.match(result.css, /\[data-flowup-scope="demo"\]/)
    assert.match(result.css, /var\(--fui-/)
  }
})

test('component installation adds dependencies and appends exports in a single package', async t => {
  const root = await createTemporaryRoot(t, 'flowup-component-single-')
  await gen(
    root,
    '--type',
    'node',
    '--name',
    'control-node',
    '--framework',
    'solid',
    '--unocss',
    '--locales',
    'en-US',
    '--non-interactive',
  )
  const dir = join(root, 'control-node')
  await gen(dir, 'component', 'button', 'checkbox-group', '--framework', 'solid')
  await gen(dir, 'component', 'alert', '--framework', 'solid')
  await gen(dir, 'component', 'button', '--framework', 'solid')

  const index = await readFile(join(dir, 'client/components/index.ts'), 'utf8')
  assert.equal(index.match(/export \* from '\.\/button'/g)?.length, 1)
  for (const name of ['alert', 'button', 'checkbox-group', 'select'])
    assert.match(index, new RegExp(`export \\* from '\\./${name}'`))
  const theme = await readFile(join(dir, 'client/components/theme.css'), 'utf8')
  assert.match(theme, /data-flowup-scope=['"]control-node['"]/)
  assert.doesNotMatch(theme, /__FLOWUP_SCOPE__|--nr-/)
  assert.match(await readFile(join(dir, 'flowup.config.ts'), 'utf8'), /'@ui'/)
  assert.match(await readFile(join(dir, 'tsconfig.app.json'), 'utf8'), /"@ui"/)
})

test('multi-entry components are shared beside nodes and plugins after later gen add', async t => {
  const root = await createTemporaryRoot(t, 'flowup-component-multi-')
  await gen(root, 'package', 'control-pack')
  const dir = join(root, 'control-pack')
  await gen(dir, 'add', 'node', 'first', '--framework', 'solid', '--unocss')
  await gen(dir, 'component', 'button', '--framework', 'solid')
  await gen(dir, 'component', 'dialog', '--framework', 'solid')
  await gen(dir, 'add', 'plugin', 'second', '--framework', 'solid', '--unocss')

  const config = await readFile(join(dir, 'flowup.config.ts'), 'utf8')
  const index = await readFile(join(dir, 'components/index.ts'), 'utf8')
  const tsconfig = JSON.parse(await readFile(join(dir, 'tsconfig.json'), 'utf8'))
  const packageJson = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  assert.match(config, /'@ui': fileURLToPath\(new URL\('\.\/components'/)
  assert.match(config, /'\*\*\/components\/\*\*\/\*\.\{jsx,tsx\}'/)
  assert.match(config, /plugins\/second\/client/)
  assert.match(index, /export \* from '\.\/button'/)
  assert.match(index, /export \* from '\.\/dialog'/)
  assert.deepEqual(tsconfig.compilerOptions.paths['@ui'], ['./components/index.ts'])
  assert.match(packageJson.scripts.typecheck, /components\/tsconfig\.json/)
  assert.match(
    await readFile(join(dir, 'components/tsconfig.json'), 'utf8'),
    /jsxImportSource.*solid-js/,
  )
})
