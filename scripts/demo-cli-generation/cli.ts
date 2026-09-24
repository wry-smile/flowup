import { spawn } from 'node:child_process'
import process from 'node:process'
import { cli } from './context.js'
import { paint } from './terminal.js'

export async function run(
  title: string,
  cwd: string,
  args: string[],
  options: { expectedFailure?: boolean; expectedMessage?: string } = {},
): Promise<void> {
  const { expectedFailure = false, expectedMessage } = options
  console.log(`\n${paint(35, `▶ ${title}`)}`)
  const result = await new Promise<{ code: number; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, [cli, ...args], {
        cwd,
        stdio: expectedFailure ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      })
      let stdout = ''
      let stderr = ''
      child.stdout?.on('data', chunk => {
        stdout += chunk
      })
      child.stderr?.on('data', chunk => {
        stderr += chunk
      })
      child.once('error', reject)
      child.once('exit', code => resolve({ code: code ?? 1, stdout, stderr }))
    },
  )

  if (expectedFailure) {
    if (result.code === 0) throw new Error(`Expected command to fail: flowup ${args.join(' ')}`)
    const output = `${result.stdout}${result.stderr}`
    process.stdout.write(output)
    if (expectedMessage && !output.includes(expectedMessage))
      throw new Error(`Expected failure output to include: ${expectedMessage}`)
    console.log(paint(32, 'Duplicate entry was rejected as expected.'))
    return
  }

  if (result.code !== 0) throw new Error(`flowup ${args.join(' ')} exited with code ${result.code}`)
}
