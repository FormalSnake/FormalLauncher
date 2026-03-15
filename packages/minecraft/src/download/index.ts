import { fetchVersionJson, loadAndMergeVersionJson, loadCachedVersionJson, saveVersionJson } from '../versions/version-json'
import { fetchVersionManifest } from '../versions/manifest'
import { downloadClientJar } from './client-jar'
import { resolveLibraries, downloadLibraries } from './libraries'
import { downloadAssets } from './assets'
import type { DownloadProgress } from '../types'

export { downloadFile } from './downloader'
export { downloadClientJar } from './client-jar'
export { resolveLibraries, downloadLibraries } from './libraries'
export { downloadAssets } from './assets'

export async function downloadGameFiles(
  gameDir: string,
  versionId: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  // 1. Get version JSON (cached or fetch)
  onProgress?.({ phase: 'version-json', current: 0, total: 1 })

  let versionJson = await loadAndMergeVersionJson(gameDir, versionId)
  if (!versionJson) {
    const manifest = await fetchVersionManifest()
    const entry = manifest.versions.find((v) => v.id === versionId)
    if (!entry) throw new Error(`Version ${versionId} not found in manifest`)

    versionJson = await fetchVersionJson(entry.url)
    await saveVersionJson(gameDir, versionId, versionJson)
  }

  onProgress?.({ phase: 'version-json', current: 1, total: 1 })

  // 2. Download client JAR
  await downloadClientJar(gameDir, versionId, versionJson.downloads.client, onProgress)

  // 3. Download libraries
  const libraries = resolveLibraries(versionJson.libraries)
  await downloadLibraries(gameDir, libraries, onProgress)

  // 4. Download assets
  await downloadAssets(gameDir, versionJson.assetIndex, onProgress)
}
