import process from 'node:process'

export function kebabCase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function toProperCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')
}

export function parseCsvList(input: string | undefined | null): string[] | undefined {
  if (!input)
    return undefined
  const list = input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return list.length ? list : undefined
}

export function parseBool(input: string | boolean | undefined | null): boolean | undefined {
  if (input === undefined || input === null)
    return undefined
  if (typeof input === 'boolean')
    return input
  const value = input.trim().toLowerCase()
  if (value === 'true' || value === '1' || value === 'yes')
    return true
  if (value === 'false' || value === '0' || value === 'no')
    return false
  return undefined
}

export function hasArgvFlag(flag: string, argv: readonly string[] = process.argv): boolean {
  return argv.some(arg => arg === flag || arg.startsWith(`${flag}=`))
}

export function stripQuotes(value: unknown): unknown {
  if (typeof value !== 'string')
    return value
  const text = value.trim()
  if (text.length >= 2) {
    const first = text.charAt(0)
    const last = text.charAt(text.length - 1)
    if ((first === '"' || first === '\'') && first === last)
      return text.slice(1, -1)
  }
  return value
}
