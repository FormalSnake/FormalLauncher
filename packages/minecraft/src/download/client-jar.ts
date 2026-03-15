import { join } from 'node:path'
import { getVersionDir, ensureDir } from '../utils/paths'
import { downloadFile } from './downloader'
import type { DownloadInfo, DownloadProgress } from '../types'

export async function downloadClientJar(
  gameDir: string,
  versionId: string,
  downloadInfo: DownloadInfo,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const dir = getVersionDir(gameDir, versionId)
  await ensureDir(dir)

  const dest = join(dir, `${versionId}.jar`)

  onProgress?.({
    phase: 'client-jar',
    current: 0,
    total: 1,
    fileName: `${versionId}.jar`,
  })

  await downloadFile(downloadInfo.url, dest, {
    sha1: downloadInfo.sha1,
    size: downloadInfo.size,
  })

  onProgress?.({
    phase: 'client-jar',
    current: 1,
    total: 1,
    fileName: `${versionId}.jar`,
  })
}
