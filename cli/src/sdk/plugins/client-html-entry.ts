import type { Plugin, Rolldown } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type OutputAsset = Rolldown.OutputAsset
type OutputBundle = Rolldown.OutputBundle
type OutputChunk = Rolldown.OutputChunk

export interface FlowupClientHtmlEntryPluginOptions {
  name: string
  template: string
}

export function flowupClientHtmlEntryPlugin(
  options: FlowupClientHtmlEntryPluginOptions,
): Plugin {
  return {
    name: 'flowup-client-html-entry',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const templatePath = path.resolve(options.template)
      if (!existsSync(templatePath)) {
        this.error(`HTML template not found: ${templatePath}`)
      }

      const template = readFileSync(templatePath, 'utf8')
      const entryChunk = findEntryChunk(bundle, options.name)
      if (!entryChunk) {
        this.error(`Client entry chunk not found: ${options.name}`)
      }

      const cssAssets = findCssAssets(bundle)
      const css = cssAssets
        .map(asset => sourceToString(asset.source))
        .join('\n')

      const html = [
        createStyleTag(css),
        createScriptTag(entryChunk?.code),
        template.trim(),
      ]
        .filter(Boolean)
        .join('\n\n')
        .concat('\n')

      this.emitFile({
        type: 'asset',
        fileName: `${options.name}.html`,
        source: html,
      })

      entryChunk?.fileName && delete bundle[entryChunk.fileName]
      for (const asset of cssAssets) {
        delete bundle[asset.fileName]
      }
    },
  }
}

function findEntryChunk(bundle: OutputBundle, entryName: string): OutputChunk | undefined {
  return Object.values(bundle).find(
    (item): item is OutputChunk =>
      item.type === 'chunk'
      && item.isEntry
      && item.name === entryName,
  )
}

function findCssAssets(bundle: OutputBundle): OutputAsset[] {
  return Object.values(bundle).filter(
    (item): item is OutputAsset =>
      item.type === 'asset'
      && item.fileName.endsWith('.css'),
  )
}

function createScriptTag(code: string = ''): string {
  return [
    '<script>',
    code.replace(/<\/script/giu, '<\\/script'),
    '</script>',
  ].join('\n')
}

function createStyleTag(css: string): string {
  if (!css)
    return ''

  return [
    '<style>',
    css.replace(/<\/style/giu, '<\\/style'),
    '</style>',
  ].join('\n')
}

function sourceToString(source: string | Uint8Array): string {
  return typeof source === 'string'
    ? source
    : new TextDecoder().decode(source)
}
