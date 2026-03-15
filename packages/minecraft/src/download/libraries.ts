import { join } from 'node:path'
import { getLibrariesDir } from '../utils/paths'
import { getMojangOS, evaluateRules } from '../utils/platform'
import { downloadFile } from './downloader'
import type { LibraryEntry, ResolvedLibrary, DownloadProgress } from '../types'

function mavenToPath(maven: string): string {
  const parts = maven.split(':')
  const group = parts[0].replaceAll('.', '/')
  const artifact = parts[1]
  const version = parts[2]
  return `${group}/${artifact}/${version}/${artifact}-${version}.jar`
}

export function resolveLibraries(libraries: LibraryEntry[]): ResolvedLibrary[] {
  const os = getMojangOS()
  const resolved: ResolvedLibrary[] = []

  for (const lib of libraries) {
    if (!evaluateRules(lib.rules)) continue

    if (lib.downloads) {
      // Vanilla-style library with downloads object
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
    } else if (lib.url) {
      // Fabric-style library with maven coordinates and url base
      const path = mavenToPath(lib.name)
      const base = lib.url.endsWith('/') ? lib.url : `${lib.url}/`
      resolved.push({
        path,
        url: `${base}${path}`,
        isNative: false,
        name: lib.name,
      })
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
