import { join } from 'node:path'
import { getAssetsDir, ensureDir } from '../utils/paths'
import { downloadFile } from './downloader'
import type { AssetIndex, AssetIndexFile, DownloadProgress } from '../types'

const ASSET_BASE_URL = 'https://resources.download.minecraft.net'

export async function downloadAssets(
  gameDir: string,
  assetIndex: AssetIndex,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const assetsDir = getAssetsDir(gameDir)
  const indexDir = join(assetsDir, 'indexes')
  await ensureDir(indexDir)

  // Download asset index JSON
  const indexPath = join(indexDir, `${assetIndex.id}.json`)
  await downloadFile(assetIndex.url, indexPath, {
    sha1: assetIndex.sha1,
    size: assetIndex.size,
  })

  // Parse asset index
  const { readFile } = await import('node:fs/promises')
  const indexData = JSON.parse(await readFile(indexPath, 'utf-8')) as AssetIndexFile
  const objects = Object.entries(indexData.objects)
  const total = objects.length

  for (let i = 0; i < total; i++) {
    const [name, { hash, size }] = objects[i]
    const prefix = hash.substring(0, 2)
    const dest = join(assetsDir, 'objects', prefix, hash)
    const url = `${ASSET_BASE_URL}/${prefix}/${hash}`

    onProgress?.({
      phase: 'assets',
      current: i,
      total,
      fileName: name,
    })

    await downloadFile(url, dest, { sha1: hash, size })
  }

  onProgress?.({
    phase: 'assets',
    current: total,
    total,
  })
}
