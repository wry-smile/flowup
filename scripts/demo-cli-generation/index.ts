import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { repositoryRoot } from './context.js'
import { runSinglePackageDemos } from './single-packages.js'
import { runMultiPackageDemo } from './multi-package.js'
import { paint } from './terminal.js'

export const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
export const outputRoot = resolve(
  process.argv[2] ?? join(repositoryRoot, '.flowup-demo', timestamp),
)

await mkdir(dirname(outputRoot), { recursive: true })
await mkdir(outputRoot, { recursive: false })
await writeFile(
  join(outputRoot, 'pnpm-workspace.yaml'),
  'packages:\n  - single-vue-node\n  - single-plugin\n  - multi-showcase\n',
)

console.log(`${paint(36, '\nFlowup CLI generation demo')}\nOutput: ${outputRoot}\n`)
await runSinglePackageDemos(outputRoot)
await runMultiPackageDemo(outputRoot)

console.log(`\nDemo files are kept at:\n  ${outputRoot}\n`)
console.log('Inspect with your editor, or run:')
console.log(`  cd "${join(outputRoot, 'multi-showcase')}" && pnpm install && pnpm build`)
