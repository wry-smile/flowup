import { createInterface } from 'node:readline/promises'
import process from 'node:process'
import { printTree as printDirectoryTree } from './files.js'

export const printTree = printDirectoryTree

export async function pauseForReview(message: string): Promise<void> {
  if (!process.stdin.isTTY || process.env.FLOWUP_DEMO_NO_PAUSE) return
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  await readline.question(`\n${message}\n`)
  readline.close()
}
