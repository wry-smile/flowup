import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { repositoryRoot } from './context.js'

export async function linkDemoCli(packageRoot: string): Promise<void> {
  const packageFile = join(packageRoot, 'package.json')
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  const relativeCliPath = relative(packageRoot, join(repositoryRoot, 'cli')).split(sep).join('/')
  pkg.devDependencies['@wry-smile/flowup'] = `link:${relativeCliPath}`
  await writeFile(packageFile, `${JSON.stringify(pkg, null, 2)}\n`)
}

export async function printTree(directory: string, prefix = ''): Promise<void> {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  for (const [index, entry] of entries.entries()) {
    const last = index === entries.length - 1
    const branch = last ? '└── ' : '├── '
    const isDirectory = entry.isDirectory()
    console.log(`${prefix}${branch}${entry.name}${isDirectory ? '/' : ''}`)
    if (isDirectory) {
      const nextPrefix = `${prefix}${last ? '    ' : '│   '}`
      await printTree(join(directory, entry.name), nextPrefix)
    }
  }
}
