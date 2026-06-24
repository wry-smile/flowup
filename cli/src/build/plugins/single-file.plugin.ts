import type { PluginOption, Rollup, UserConfig } from 'vite'
import micromatch from 'micromatch'

type OutputOptions = Rollup.OutputOptions
type OutputAsset = Rollup.OutputAsset
type OutputChunk = Rollup.OutputChunk

export interface Config {
  useRecommendedBuildConfig?: boolean
  /**
   * 是否移除 type="module" 属性,转成普通 <script> 标签。
   * 开启后 inline 代码会被 Node-RED 加载器当作 classic script 执行。
   * 默认 true。
   */
  removeModuleType?: boolean
  removeViteModuleLoader?: boolean
  inlinePattern?: string[]
  deleteInlinedFiles?: boolean
  overrideConfig?: Partial<UserConfig>
}

const defaultConfig = {
  useRecommendedBuildConfig: true,
  removeModuleType: true,
  removeViteModuleLoader: false,
  deleteInlinedFiles: true,
}

function demoteAndInlineScript(
  html: string,
  scriptFilename: string,
  scriptCode: string,
  removeModuleType: boolean,
  removeViteModuleLoader: boolean,
): string {
  // 一次匹配完成:剥 type="module" + 把 src 替换成内联代码。
  // 关键是 type="module" 可能出现在 src 前面或后面,需要可任意位置。
  const f = scriptFilename.replaceAll('.', '\\.')
  // 构造一个能匹配以下三种情况的统一 regex:
  //   <script type="module" src="...editor-XYZ.js" crossorigin></script>
  //   <script src="...editor-XYZ.js" type="module" crossorigin></script>
  //   <script src="...editor-XYZ.js" crossorigin></script>
  // 拆解:整个标签拆成 <script + 属性前缀 + (type=module) + 属性中段 + src=... + 属性后段 + >
  const re = new RegExp(
    `<script\\b([^>]*?)(\\s+type="module")?([^>]*?)\\s+src="(?:[^"]*?/)?${f}"([^>]*?)></script>`,
    'i',
  )
  const preloadMarker = /"?__VITE_PRELOAD__"?/g
  const escapedCode = scriptCode
    .replace(preloadMarker, 'void 0')
    .replace(/<(\/script>|!--)/g, '\\x3C$1')

  const out = html.replace(re, (_match, beforeType, typeAttr, mid, after) => {
    const cleanedBeforeType = removeModuleType && typeAttr ? '' : beforeType
    const cleanedMid = removeModuleType ? mid : mid
    return `<script${cleanedBeforeType}${cleanedMid}${after}>${escapedCode.trim()}</script>`
  })

  return removeViteModuleLoader ? _removeViteModuleLoader(out, escapedCode) : out
}

export function replaceScript(
  html: string,
  scriptFilename: string,
  scriptCode: string,
  removeModuleType = true,
  removeViteModuleLoader = false,
): string {
  return demoteAndInlineScript(html, scriptFilename, scriptCode, removeModuleType, removeViteModuleLoader)
}

export function replaceCss(html: string, scriptFilename: string, scriptCode: string): string {
  const f = scriptFilename.replaceAll('.', '\\.')
  const reStyle = new RegExp(`<link([^>]*?) href="(?:[^"]*?/)?${f}"([^>]*)>`)
  const newCode = scriptCode.replace(`@charset "UTF-8";`, '')
  return html.replace(reStyle, (_, beforeSrc, afterSrc) => `<style${beforeSrc}${afterSrc}>${newCode.trim()}</style>`)
}

const isJsFile = /\.[mc]?js$/
const isCssFile = /\.css$/
const isHtmlFile = /\.html?$/

export function viteSingleFile({
  useRecommendedBuildConfig = true,
  removeModuleType = true,
  removeViteModuleLoader = false,
  inlinePattern = [],
  deleteInlinedFiles = true,
  overrideConfig = {},
}: Config = defaultConfig): PluginOption {
  const _useRecommendedBuildConfig = (config: UserConfig) => {
    if (!config.build)
      config.build = {}
    config.build.assetsInlineLimit = () => true
    config.build.chunkSizeWarningLimit = 100000000
    config.build.cssCodeSplit = false
    config.base = './'
    config.build.assetsDir = ''

    if (!config.build.rolldownOptions)
      config.build.rolldownOptions = {}
    if (!config.build.rolldownOptions.output)
      config.build.rolldownOptions.output = {}

    const updateOutputOptions = (out: OutputOptions) => {
      out.inlineDynamicImports = true
    }

    if (Array.isArray(config.build.rolldownOptions?.output)) {
      for (const o of config.build.rolldownOptions?.output) updateOutputOptions(o as OutputOptions)
    }
    else {
      updateOutputOptions(config.build.rolldownOptions?.output as OutputOptions)
    }

    Object.assign(config, overrideConfig)
  }

  return {
    name: 'vite:singlefile',
    config: useRecommendedBuildConfig ? _useRecommendedBuildConfig : undefined,
    enforce: 'post',
    generateBundle(_, bundle) {
      const warnNotInlined = (filename: string) => this.info(`NOTE: asset not inlined: ${filename}`)
      this.info('\n')
      const files = {
        html: [] as string[],
        css: [] as string[],
        js: [] as string[],
        other: [] as string[],
      }
      for (const i of Object.keys(bundle)) {
        if (isHtmlFile.test(i))
          files.html.push(i)
        else if (isCssFile.test(i))
          files.css.push(i)
        else if (isJsFile.test(i))
          files.js.push(i)
        else
          files.other.push(i)
      }
      const bundlesToDelete = [] as string[]

      for (const name of files.html) {
        const htmlChunk = bundle[name] as OutputAsset
        let replacedHtml = htmlChunk.source as string
        for (const filename of files.js) {
          if (inlinePattern.length && !micromatch.isMatch(filename, inlinePattern)) {
            warnNotInlined(filename)
            continue
          }
          const jsChunk = bundle[filename] as OutputChunk
          if (jsChunk.code != null) {
            this.info(`Inlining: ${filename}`)
            bundlesToDelete.push(filename)
            replacedHtml = replaceScript(replacedHtml, jsChunk.fileName, jsChunk.code, removeModuleType, removeViteModuleLoader)
          }
        }
        for (const filename of files.css) {
          if (inlinePattern.length && !micromatch.isMatch(filename, inlinePattern)) {
            warnNotInlined(filename)
            continue
          }
          const cssChunk = bundle[filename] as OutputAsset
          this.info(`Inlining: ${filename}`)
          bundlesToDelete.push(filename)
          replacedHtml = replaceCss(replacedHtml, cssChunk.fileName, cssChunk.source as string)
        }
        htmlChunk.source = replacedHtml
      }

      if (deleteInlinedFiles) {
        for (const name of bundlesToDelete) {
          delete bundle[name]
        }
      }
      for (const name of files.other) {
        warnNotInlined(name)
      }
    },
  }
}

function _removeViteModuleLoader(html: string, _scriptCode: string) {
  // Vite 在 ESM 模式下会在 client entry 顶部塞一个 modulepreload polyfill IIFE。
  // 我们已经去掉 type="module",所以 polyfill 变成普通 IIFE 跑在浏览器里,会报
  // "MutationObserver is not defined" 等怪异错误。直接剥掉这段。
  return html.replace(
    /\(function(?: polyfill)?\(\)\s*\{[\s\S]*?\}\)\(\);/,
    '',
  )
}
