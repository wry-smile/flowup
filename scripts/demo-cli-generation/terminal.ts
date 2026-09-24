import process from 'node:process'

export function paint(code: number, text: string): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return text
  return `\u001B[${code}m${text}\u001B[0m`
}
