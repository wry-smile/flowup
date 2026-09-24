import * as p from '@clack/prompts'
import pc from 'picocolors'

export function showGenerationGuide(title: string, details: string[], commands: string[]): void {
  const lines = [
    ...details.map(detail => `${pc.green('✓')} ${detail}`),
    ...(commands.length ? [''] : []),
    ...commands.map((command, index) => `${pc.dim(`${index + 1}.`)} ${pc.cyan(command)}`),
  ]
  p.note(lines.join('\n'), pc.bold(pc.green(title)))
}
