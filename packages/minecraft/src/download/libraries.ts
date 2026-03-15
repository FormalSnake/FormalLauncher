import { join } from 'node:path'
import { getLibrariesDir } from '../utils/paths'
import { getMojangOS, evaluateRules } from '../utils/platform'
import { downloadFile } from './downloader'
import type { LibraryEntry, ResolvedLibrary, DownloadProgress } from '../types'

export function resolveLibraries(libraries: LibraryEntry[]): ResolvedLibrary[] {
  const os = getMojangOS()
  const resolved: ResolvedLibrary[] = []

  for (const lib of libraries) {
    if (!evaluateRules(lib.rules)) continue

    // Regular artifact
    if (lib.downloads.artifact) {
      resolved.push({
        path: lib.downloads.artifact.path,
        url: lib.downloads.artifact.url,
        sha1: lib.downloads.artifact.sha1,
        size: lib.downloads.artifact.size,
        isNative: false,
        name: lib.name,
      })
    }

    // Native classifiers
    if (lib.natives && lib.downloads.classifiers) {
      const nativeKey = lib.natives[os]
      if (nativeKey) {
        const classifier = lib.downloads.classifiers[nativeKey]
        if (classifier) {
          resolved.push({
            path: classifier.path,
            url: classifier.url,
            sha1: classifier.sha1,
            size: classifier.size,
            isNative: true,
            extractExclude: lib.extract?.exclude,
            name: lib.name,
          })
        }
      }
    }
  }

  return resolved
}

export async function downloadLibraries(
  gameDir: string,
  libraries: ResolvedLibrary[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const libDir = getLibrariesDir(gameDir)
  const total = libraries.length

  for (let i = 0; i < total; i++) {
    const lib = libraries[i]
    const dest = join(libDir, lib.path)

    onProgress?.({
      phase: 'libraries',
      current: i,
      total,
      fileName: lib.name,
    })

    await downloadFile(lib.url, dest, {
      sha1: lib.sha1,
      size: lib.size,
    })
  }

  onProgress?.({
    phase: 'libraries',
    current: total,
    total,
  })
}
