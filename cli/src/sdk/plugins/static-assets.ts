import type { Plugin } from 'vite'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export interface FlowupStaticAssetsPluginOptions {
  cwd?: string
  dirs: string[]
}

export function flowupStaticAssetsPlugin(options: FlowupStaticAssetsPluginOptions): Plugin {
  return {
    name: 'flowup-static-assets',
    apply: 'build',
    generateBundle() {
      const cwd = path.resolve(options.cwd ?? process.cwd())
      for (const dir of options.dirs) {
        const absDir = path.resolve(cwd, dir)
        if (!existsSync(absDir))
          continue

        for (const file of walkFiles(absDir)) {
          const relFromDir = path.relative(absDir, file)
          const relPath = normalizePath(path.join(dir, relFromDir))
          this.emitFile({
            type: 'asset',
            fileName: relPath,
            source: readFileSync(file),
          })
        }
      }
    },
  }
}

function walkFiles(dir: string): string[] {
  const output: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store' || name.startsWith('.'))
      continue

    const absPath = path.resolve(dir, name)
    const stats = statSync(absPath)
    if (stats.isDirectory()) {
      output.push(...walkFiles(absPath))
      continue
    }

    output.push(absPath)
  }
  return output
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
