import type { Plugin } from 'vite'
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export interface FlowupStaticAssetsPluginOptions {
  cwd?: string
  dirs: string[]
  mappedDirs?: Array<{ dir: string; outDir: string; fileNamePrefix?: string }>
}

export function flowupStaticAssetsPlugin(options: FlowupStaticAssetsPluginOptions): Plugin {
  return {
    name: 'flowup-static-assets',
    apply: 'build',
    generateBundle() {
      const cwd = path.resolve(options.cwd ?? process.cwd())
      const sources = [
        ...options.dirs.map(dir => ({ dir, outDir: dir, fileNamePrefix: undefined })),
        ...(options.mappedDirs ?? []),
      ]
      for (const { dir, outDir, fileNamePrefix } of sources) {
        const absDir = path.resolve(cwd, dir)
        if (!existsSync(absDir)) continue

        for (const file of walkFiles(absDir)) {
          const relFromDir = path.relative(absDir, file)
          const relPath = fileNamePrefix
            ? normalizePath(
                path.join(outDir, `${fileNamePrefix}${relFromDir.replaceAll(path.sep, '-')}`),
              )
            : normalizePath(path.join(outDir, relFromDir))
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
    if (name === '.DS_Store' || name === 'README.md' || name.startsWith('.')) continue

    const absPath = path.resolve(dir, name)
    const stats = lstatSync(absPath)
    if (stats.isSymbolicLink()) continue
    if (stats.isDirectory()) {
      output.push(...walkFiles(absPath))
      continue
    }

    if (stats.isFile()) output.push(absPath)
  }
  return output
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
