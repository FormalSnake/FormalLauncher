import { join } from 'node:path'
import { getNativesDir, getLibrariesDir, ensureDir } from '../utils/paths'
import type { ResolvedLibrary } from '../types'

export async function extractNatives(
  gameDir: string,
  versionId: string,
  libraries: ResolvedLibrary[],
): Promise<string> {
  const nativesDir = getNativesDir(gameDir, versionId)
  await ensureDir(nativesDir)

  const libDir = getLibrariesDir(gameDir)
  const nativeLibs = libraries.filter((lib) => lib.isNative)

  for (const lib of nativeLibs) {
    const jarPath = join(libDir, lib.path)
    await extractJar(jarPath, nativesDir, lib.extractExclude)
  }

  return nativesDir
}

async function extractJar(
  jarPath: string,
  destDir: string,
  exclude?: string[],
): Promise<void> {
  // Use Node.js built-in zlib via a simple approach
  // Extract using the unzip approach with yauzl or manual extraction
  // For simplicity, use child_process to call jar/unzip
  const { exec } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execAsync = promisify(exec)

  try {
    // Try using jar command first (comes with Java)
    await execAsync(`jar xf "${jarPath}"`, { cwd: destDir })
  } catch {
    try {
      // Fallback to unzip
      await execAsync(`unzip -o -q "${jarPath}" -d "${destDir}"`)
    } catch {
      // If both fail, skip this native — it may not be needed on this platform
      console.warn(`Failed to extract native: ${jarPath}`)
    }
  }

  // Clean up excluded files (like META-INF)
  if (exclude) {
    const { rm } = await import('node:fs/promises')
    for (const pattern of exclude) {
      const excludePath = join(destDir, pattern.replace('/', ''))
      try {
        await rm(excludePath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup failures
      }
    }
  }
}
