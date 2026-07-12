import { useShadowRoot } from 'vue'

export interface TailwindBridgeOptions {
  rewriteRootToHost?: boolean
  appendPropertyFallbacks?: boolean
}

const sheetCache = new Map<string, CSSStyleSheet>()

export function createTailwindcssBridge(
  cssText: string,
  options: TailwindBridgeOptions = {},
): () => void {
  return function useTailwindcss(): void {
    const shadowRoot = useShadowRoot()
    if (!shadowRoot)
      return

    const sheet = getStyleSheet(cssText, options)
    if (shadowRoot.adoptedStyleSheets.includes(sheet))
      return

    shadowRoot.adoptedStyleSheets = [
      ...shadowRoot.adoptedStyleSheets,
      sheet,
    ]
  }
}

export function getStyleSheet(
  cssText: string,
  options: TailwindBridgeOptions = {},
): CSSStyleSheet {
  const cacheKey = JSON.stringify([
    cssText,
    options.rewriteRootToHost !== false,
    options.appendPropertyFallbacks !== false,
  ])
  const cached = sheetCache.get(cacheKey)
  if (cached)
    return cached

  const sheet = new CSSStyleSheet()
  sheet.replaceSync(
    options.rewriteRootToHost === false
      ? cssText
      : cssText.replace(/(^|[,{]\s*):root(?=\s*[,{[])/g, '$1:host'),
  )

  if (options.appendPropertyFallbacks !== false)
    appendPropertyFallbacks(sheet)

  sheetCache.set(cacheKey, sheet)
  return sheet
}

function appendPropertyFallbacks(sheet: CSSStyleSheet): void {
  if (typeof CSSPropertyRule === 'undefined')
    return

  const declarations: string[] = []
  for (const rule of Array.from(sheet.cssRules) as CSSRule[]) {
    if (rule instanceof CSSPropertyRule && rule.initialValue) {
      declarations.push(`${rule.name}: ${rule.initialValue}`)
    }
  }

  if (declarations.length > 0) {
    sheet.insertRule(`:host { ${declarations.join(';')} }`, sheet.cssRules.length)
  }
}
