import { join } from 'node:path'
import { getNativesDir, getLibrariesDir, ensureDir } from '../utils/paths'
import type { ResolvedLibrary } from '../types'
import AdmZip from 'adm-zip'

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
  try {
    const zip = new AdmZip(jarPath)
    const entries = zip.getEntries()

    for (const entry of entries) {
      if (entry.isDirectory) continue

      // Check if entry matches any exclusion pattern
      if (exclude?.some((pattern) => entry.entryName.startsWith(pattern))) {
        continue
      }

      zip.extractEntryTo(entry, destDir, true, true)
    }
  } catch {
    console.warn(`Failed to extract native: ${jarPath}`)
  }
}
