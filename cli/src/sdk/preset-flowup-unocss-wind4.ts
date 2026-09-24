import type { CSSProcessor } from '@unocss/core'
import { presetWind4 } from '@unocss/preset-wind4'

export interface FlowupWind4Options {
  /** UnoCSS constructs presets before Flowup resolves defineConfig, so pass the same scope explicitly. */
  scope: string
}

/** Wind4 utilities and preflights restricted to a Flowup editor panel. */
export function presetFlowupWind4({ scope }: FlowupWind4Options) {
  if (!/^[a-z][a-z0-9-]*$/.test(scope))
    throw new Error('Flowup CSS scope must be a kebab-case name.')

  const selector = `[data-flowup-scope="${scope}"]`
  const namePrefix = `flowup-${scope}-`
  const wind = presetWind4({
    important: selector,
    variablePrefix: namePrefix,
    preflights: {
      reset: false,
      property: {
        selector: [
          selector,
          `${selector} *`,
          `${selector}::before`,
          `${selector}::after`,
          `${selector} *::before`,
          `${selector} *::after`,
          `${selector}::backdrop`,
          `${selector} *::backdrop`,
        ].join(', '),
      },
    },
  })

  return {
    ...wind,
    name: 'flowup-wind4',
    preflights: [
      ...(wind.preflights ?? []).map(preflight =>
        preflight.layer === 'theme'
          ? {
              ...preflight,
              async getCSS(context: Parameters<typeof preflight.getCSS>[0]) {
                const css = await preflight.getCSS(context)
                if (!css) return css
                const scoped = css.replace(/:root\s*,\s*:host\s*\{/, `${selector}{`)
                if (scoped === css) throw new Error('Wind4 theme selector has changed.')
                return scoped
              },
            }
          : preflight,
      ),
      {
        layer: 'base',
        getCSS: () => scopedReset(selector),
      },
    ],
    processors: [...(wind.processors ?? []), createAnimationProcessor(namePrefix)],
  }
}

function scopedReset(selector: string): string {
  return `
${selector}, ${selector} *, ${selector}::before, ${selector}::after,
${selector} *::before, ${selector} *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}
${selector} { line-height: 1.5; font-family: system-ui, sans-serif; }
${selector} button, ${selector} input, ${selector} select, ${selector} textarea {
  font: inherit;
  color: inherit;
}
${selector} button { background-color: transparent; }
${selector} ol, ${selector} ul, ${selector} menu { list-style: none; }
${selector} img, ${selector} video, ${selector} svg { display: block; }
${selector} img, ${selector} video { max-width: 100%; height: auto; }
${selector} [hidden]:not([hidden~='until-found']) { display: none !important; }
`
}

function createAnimationProcessor(namePrefix: string): CSSProcessor {
  return {
    name: 'flowup-wind4-animations',
    process(css, { theme }) {
      const animation = (theme as { animation?: { keyframes?: Record<string, string> } }).animation
      for (const name of Object.keys(animation?.keyframes ?? {})) {
        const escaped = escapeRegExp(name)
        css = css.replace(
          new RegExp(`(@(?:-webkit-)?keyframes\\s+)${escaped}(?=\\s*\\{)`, 'g'),
          `$1${namePrefix}${name}`,
        )
        css = css.replace(
          /(animation(?:-name)?\s*:\s*)([^;}]+)/g,
          (_match, property: string, value: string) => {
            const renamed = value.replace(
              new RegExp(`(^|[\\s,])${escaped}(?=$|[\\s,])`, 'g'),
              `$1${namePrefix}${name}`,
            )
            return `${property}${renamed}`
          },
        )
      }
      return css
    },
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
