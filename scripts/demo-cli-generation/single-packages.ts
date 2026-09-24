import { join } from 'node:path'
import { linkDemoCli } from './files.js'
import { run } from './cli.js'

export async function runSinglePackageDemos(outputRoot: string): Promise<void> {
  await run('Create a Vue node with UnoCSS', outputRoot, [
    'gen',
    '--type',
    'node',
    '--name',
    'single-vue-node',
    '--framework',
    'vue',
    '--unocss',
    '--locales',
    'en-US,zh-CN',
    '--non-interactive',
  ])
  await linkDemoCli(join(outputRoot, 'single-vue-node'))

  await run('Create a plain TypeScript plugin', outputRoot, [
    'gen',
    '--type',
    'plugin',
    '--name',
    'single-plugin',
    '--framework',
    'vanilla',
    '--locales',
    'en-US,zh-CN',
    '--non-interactive',
  ])
  await linkDemoCli(join(outputRoot, 'single-plugin'))
}
