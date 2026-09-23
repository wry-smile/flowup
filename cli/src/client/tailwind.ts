import { getCurrentInstance, nextTick, onMounted, useShadowRoot } from 'vue'

export interface TailwindBridgeOptions {
  rewriteRootToHost?: boolean
  appendPropertyFallbacks?: boolean
}

const sheetCache = new Map<string, CSSStyleSheet>()
const ROOT_SELECTOR_RE = /(^|[\s,{]):root(?=\s*[:,{[])/g

export function createTailwindcssBridge(
  cssText: string,
  options: TailwindBridgeOptions = {},
): () => void {
  return function useTailwindcss(): void {
    const instance = getCurrentInstance()
    const inject = (): void => {
      const shadowRoot =
        useShadowRoot() ??
        (instance?.vnode.el as HTMLElement | null | undefined)?.shadowRoot ??
        null
      if (!shadowRoot) return

      const sheet = getStyleSheet(cssText, options)
      if (shadowRoot.adoptedStyleSheets.includes(sheet)) return

      shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, sheet]
    }

    inject()
    onMounted(() => {
      void nextTick(inject)
    })
  }
}

export function getStyleSheet(cssText: string, options: TailwindBridgeOptions = {}): CSSStyleSheet {
  const cacheKey = JSON.stringify([
    cssText,
    options.rewriteRootToHost !== false,
    options.appendPropertyFallbacks !== false,
  ])
  const cached = sheetCache.get(cacheKey)
  if (cached) return cached

  const resolvedCssText =
    options.rewriteRootToHost === false ? cssText : cssText.replace(ROOT_SELECTOR_RE, '$1:host')

  const sheet = new CSSStyleSheet()
  sheet.replaceSync(resolvedCssText)

  if (options.appendPropertyFallbacks !== false) appendPropertyFallbacks(sheet, resolvedCssText)

  sheetCache.set(cacheKey, sheet)
  return sheet
}

function appendPropertyFallbacks(sheet: CSSStyleSheet, cssText: string): void {
  const declarations = new Map<string, string>()
  collectCustomPropertyDeclarations(cssText, declarations)
  collectPropertyInitialValues(cssText, declarations)

  if (declarations.size > 0) {
    const fallbackText = Array.from(declarations, ([name, value]) => `${name}: ${value}`).join(';')
    sheet.insertRule(`:host, * { ${fallbackText} }`, sheet.cssRules.length)
  }
}

function collectCustomPropertyDeclarations(
  cssText: string,
  declarations: Map<string, string>,
): void {
  let cursor = 0
  while (cursor < cssText.length) {
    const nameStart = cssText.indexOf('--tw-', cursor)
    if (nameStart === -1) return

    const nameEnd = findIdentifierEnd(cssText, nameStart)
    const separator = skipWhitespace(cssText, nameEnd)
    if (cssText[separator] !== ':') {
      cursor = nameEnd
      continue
    }

    const valueStart = skipWhitespace(cssText, separator + 1)
    const valueEnd = findDeclarationEnd(cssText, valueStart)
    if (cssText[valueEnd] === ';') {
      const name = cssText.slice(nameStart, nameEnd)
      const value = cssText.slice(valueStart, valueEnd).trim()
      if (value && !declarations.has(name)) declarations.set(name, value)
    }
    cursor = Math.max(nameEnd, valueEnd + 1)
  }
}

function collectPropertyInitialValues(cssText: string, declarations: Map<string, string>): void {
  let cursor = 0
  while (cursor < cssText.length) {
    const ruleStart = cssText.indexOf('@property', cursor)
    if (ruleStart === -1) return

    const nameStart = skipWhitespace(cssText, ruleStart + '@property'.length)
    const nameEnd = findIdentifierEnd(cssText, nameStart)
    const blockStart = skipWhitespace(cssText, nameEnd)
    if (!cssText.startsWith('--', nameStart) || cssText[blockStart] !== '{') {
      cursor = Math.max(nameEnd, ruleStart + '@property'.length)
      continue
    }

    const blockEnd = cssText.indexOf('}', blockStart + 1)
    if (blockEnd === -1) return

    const name = cssText.slice(nameStart, nameEnd)
    for (const declaration of cssText.slice(blockStart + 1, blockEnd).split(';')) {
      const separator = declaration.indexOf(':')
      if (separator === -1) continue
      if (declaration.slice(0, separator).trim() !== 'initial-value') continue

      const value = declaration.slice(separator + 1).trim()
      if (value) declarations.set(name, value)
      break
    }
    cursor = blockEnd + 1
  }
}

function findIdentifierEnd(cssText: string, start: number): number {
  let cursor = start
  while (cursor < cssText.length && isIdentifierCharacter(cssText[cursor]!)) cursor += 1
  return cursor
}

function isIdentifierCharacter(character: string): boolean {
  return character === '-' || character === '_' || /[a-z0-9]/i.test(character)
}

function skipWhitespace(cssText: string, start: number): number {
  let cursor = start
  while (cursor < cssText.length && /\s/.test(cssText[cursor]!)) cursor += 1
  return cursor
}

function findDeclarationEnd(cssText: string, start: number): number {
  let cursor = start
  while (cursor < cssText.length && !';{}\n\r'.includes(cssText[cursor]!)) cursor += 1
  return cursor
}
