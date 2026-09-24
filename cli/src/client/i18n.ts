import type { EditorRED } from 'node-red'

export function createClientI18n(
  red: Pick<EditorRED, '_'>,
  moduleNamespace: string,
  entryName: string,
) {
  return (key: string, params?: Record<string, string | number>): string =>
    red._(`${moduleNamespace}:${entryName}.${key}`, params)
}
