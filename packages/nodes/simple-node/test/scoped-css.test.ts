import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const htmlPath = resolve(process.cwd(), 'dist/simple-node.html')
const html = readFileSync(htmlPath, 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
const scope = '[data-flowup-scope=simple-node]'
const components = [
  'client/App.vue',
  'client/components/UtilityGallery.vue',
  'client/components/VariantPlayground.vue',
  'client/components/ScopedDialog.vue',
]

function escapedClass(name: string): string {
  return name.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
}

describe('built Wind4 CSS', () => {
  it('generates every static utility used by the example components', () => {
    for (const component of components) {
      const source = readFileSync(resolve(process.cwd(), component), 'utf8')
      for (const [, value] of source.matchAll(/(?<!:)\bclass="([^"]+)"/g)) {
        for (const name of value.split(/\s+/).filter(Boolean)) {
          if (name === 'group') continue
          expect(css, `${component}: ${name}`).toContain(`.${escapedClass(name)}`)
        }
      }
    }
  })

  it('emits representative classes from every gallery category', () => {
    const categories: Record<string, string[]> = {
      layout: ['flex', 'grid', 'block', 'relative', 'fixed', 'inset-0', 'z-50'],
      sizing: ['w-full', 'max-w-sm', 'size-10', 'min-w-0'],
      spacing: ['p-4', 'px-3', 'gap-3', 'mt-2', 'mx-auto'],
      typography: ['text-sm', 'font-semibold', 'tracking-tight', 'truncate', 'tabular-nums'],
      colors: ['bg-indigo-600', 'text-slate-600', 'border-slate-200'],
      effects: ['rounded-xl', 'shadow-xl', 'ring-2', 'opacity-50'],
      gradients: ['bg-gradient-to-r', 'from-indigo-500', 'via-violet-500', 'to-fuchsia-500'],
      arbitrary: ['p-[1px]', 'rounded-[11px]', 'text-[13px]', 'leading-[1.6]'],
      animation: ['animate-pulse', 'transition', 'duration-200', 'ease-in-out'],
    }

    for (const [category, names] of Object.entries(categories)) {
      for (const name of names) {
        expect(css, `${category}: ${name}`).toContain(`${scope} .${escapedClass(name)}`)
      }
    }
  })

  it('keeps variants and media rules scoped', () => {
    for (const name of [
      'hover:bg-indigo-700',
      'focus:ring-2',
      'disabled:opacity-50',
      'active:scale-95',
      'placeholder:text-slate-400',
      'first-letter:font-bold',
    ]) {
      expect(css, name).toContain(`${scope} .${escapedClass(name)}`)
    }
    expect(css).toContain(`${scope} .${escapedClass('sm:grid-cols-3')}`)
    expect(css).toContain(`${scope} :is(.dark .${escapedClass('dark:bg-slate-900')})`)
    expect(css).toContain(
      `${scope} :is(.group:hover .${escapedClass('group-hover:bg-emerald-500')})`,
    )
    expect(css).toMatch(/@media\s*\(width>=40rem\)/)
    expect(css).not.toMatch(/(?:^|[{}])\s*\.[a-zA-Z]/)
  })

  it('isolates theme variables, registered properties and animation names', () => {
    expect(css).toContain(`${scope}{--container-3xl:`)
    expect(css).toContain('@property --flowup-simple-node-bg-opacity{')
    expect(css).toContain('@keyframes flowup-simple-node-pulse{')
    expect(css).toMatch(/\.animate-pulse\{animation:[^}]*flowup-simple-node-pulse\}/)
    expect(css).not.toMatch(/@property --(?:bg-opacity|ring-opacity)\{/)
    expect(css).not.toMatch(/@keyframes pulse\{/)
    expect(html).toContain('data-flowup-scope="simple-node" class="flowup-vue-root"')
  })
})
