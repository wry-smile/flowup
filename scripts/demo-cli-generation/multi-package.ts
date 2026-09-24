import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { linkDemoCli } from './files.js'
import { pauseForReview, printTree } from './display.js'
import { paint } from './terminal.js'
import { run } from './cli.js'

export async function runMultiPackageDemo(outputRoot: string): Promise<void> {
  console.log(`\n${paint(36, 'Phase 1: create the multi-entry package only')}`)
  await run('Create a multi-entry package', outputRoot, ['gen', 'package', 'multi-showcase'])

  const multiRoot = join(outputRoot, 'multi-showcase')
  await linkDemoCli(multiRoot)
  console.log(`\n${paint(36, 'Empty package structure (before adding entries)')}`)
  await printTree(multiRoot)

  await run(
    'Try creating the same package name again (this should fail clearly)',
    outputRoot,
    ['gen', 'package', 'multi-showcase'],
    { expectedFailure: true, expectedMessage: 'already exists' },
  )

  await pauseForReview(
    'Inspect the empty package above. Press Enter to continue and add nodes/plugins.',
  )

  console.log(`\n${paint(36, 'Phase 2: enter the package and add nodes/plugins')}`)
  await run('Add a Vue node', multiRoot, [
    'gen',
    'add',
    'node',
    'vue-node',
    '--framework',
    'vue',
    '--unocss',
  ])
  await run('Add a Preact node', multiRoot, [
    'gen',
    'add',
    'node',
    'preact-node',
    '--framework',
    'preact',
    '--unocss',
  ])
  await run('Add a Solid node', multiRoot, [
    'gen',
    'add',
    'node',
    'solid-node',
    '--framework',
    'solid',
    '--unocss',
  ])
  await run('Add a Svelte plugin', multiRoot, [
    'gen',
    'add',
    'plugin',
    'svelte-plugin',
    '--framework',
    'svelte',
    '--unocss',
  ])
  await run(
    'Try adding a duplicate entry (this should fail clearly)',
    multiRoot,
    ['gen', 'add', 'node', 'vue-node', '--framework', 'vue', '--unocss'],
    { expectedFailure: true, expectedMessage: 'already exists' },
  )

  console.log(paint(36, '\nGenerated directory tree'))
  await printTree(outputRoot)

  console.log(paint(36, '\nMulti-entry Vite configuration'))
  console.log(await readFile(join(multiRoot, 'flowup.config.ts'), 'utf8'))

  const pkg = JSON.parse(await readFile(join(multiRoot, 'package.json'), 'utf8'))
  console.log(paint(36, 'Node-RED package mappings'))
  console.log(JSON.stringify(pkg['node-red'], null, 2))
  console.log(paint(36, 'Framework dependencies'))
  console.log(
    Object.entries(pkg.devDependencies)
      .filter(([name]) =>
        [
          '@preact/preset-vite',
          '@sveltejs/vite-plugin-svelte',
          '@vitejs/plugin-vue',
          'preact',
          'solid-js',
          'svelte',
          'unocss',
          'vite-plugin-solid',
        ].includes(name),
      )
      .map(([name, version]) => `  ${name}: ${version}`)
      .join('\n'),
  )
}
