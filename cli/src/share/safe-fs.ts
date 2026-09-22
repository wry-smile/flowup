import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, realpath, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

export async function canonicalPath(filePath: string): Promise<string> {
  const absolutePath = resolve(filePath)
  if (existsSync(absolutePath))
    return realpath(absolutePath)

  const parent = dirname(absolutePath)
  if (parent === absolutePath)
    return absolutePath

  return join(await canonicalPath(parent), basename(absolutePath))
}

export function isPathInside(parentDir: string, childPath: string): boolean {
  const relPath = relative(parentDir, childPath)
  return relPath !== '' && !relPath.startsWith('..') && !isAbsolute(relPath)
}

export function pathsOverlap(left: string, right: string): boolean {
  return left === right || isPathInside(left, right) || isPathInside(right, left)
}

export async function assertSafeAssembleOutput(
  outputDir: string,
  sourcePackageDirs: string[],
): Promise<void> {
  const canonicalOutput = await canonicalPath(outputDir)

  for (const sourcePackageDir of sourcePackageDirs) {
    const canonicalSource = await canonicalPath(sourcePackageDir)
    const canonicalDist = await canonicalPath(join(sourcePackageDir, 'dist'))

    if (pathsOverlap(canonicalOutput, canonicalSource)) {
      throw new Error(
        `Unsafe assemble output directory: ${outputDir} overlaps source package ${sourcePackageDir}.`,
      )
    }

    if (pathsOverlap(canonicalOutput, canonicalDist)) {
      throw new Error(
        `Unsafe assemble output directory: ${outputDir} overlaps source dist ${join(sourcePackageDir, 'dist')}.`,
      )
    }
  }
}

export async function createStagingDir(finalDir: string): Promise<string> {
  const resolvedFinal = resolve(finalDir)
  const parentDir = dirname(resolvedFinal)
  await mkdir(parentDir, { recursive: true })
  await recoverInterruptedCommit(resolvedFinal)
  await cleanupStaleStagingDirs(resolvedFinal)

  const stagingDir = join(
    parentDir,
    `.${basename(resolvedFinal)}.flowup-tmp-${randomUUID()}`,
  )
  await mkdir(stagingDir)
  return stagingDir
}

export async function commitStagedDirectory(stagingDir: string, finalDir: string): Promise<void> {
  const resolvedStaging = resolve(stagingDir)
  const resolvedFinal = resolve(finalDir)
  const backupDir = getBackupDir(resolvedFinal)
  await recoverInterruptedCommit(resolvedFinal)
  const hadExistingOutput = existsSync(resolvedFinal)

  if (hadExistingOutput)
    await rename(resolvedFinal, backupDir)

  try {
    await rename(resolvedStaging, resolvedFinal)
  }
  catch (error) {
    if (hadExistingOutput && existsSync(backupDir))
      await rename(backupDir, resolvedFinal)
    throw error
  }

  if (hadExistingOutput)
    await rm(backupDir, { recursive: true, force: true })
}

async function recoverInterruptedCommit(finalDir: string): Promise<void> {
  const backupDir = getBackupDir(finalDir)
  if (!existsSync(backupDir))
    return

  if (existsSync(finalDir)) {
    await rm(backupDir, { recursive: true, force: true })
    return
  }

  await rename(backupDir, finalDir)
}

async function cleanupStaleStagingDirs(finalDir: string): Promise<void> {
  const parentDir = dirname(finalDir)
  const prefix = `.${basename(finalDir)}.flowup-tmp-`
  for (const entry of await readdir(parentDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(prefix))
      continue
    await rm(join(parentDir, entry.name), { recursive: true, force: true })
  }
}

function getBackupDir(finalDir: string): string {
  return join(dirname(finalDir), `.${basename(finalDir)}.flowup-backup`)
}
