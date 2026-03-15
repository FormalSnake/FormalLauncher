import { createWriteStream } from 'node:fs'
import { dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { ensureDir } from '../utils/paths'
import { verifyFile } from '../utils/hash'

export async function downloadFile(
  url: string,
  dest: string,
  options?: { sha1?: string; size?: number },
): Promise<void> {
  // Skip if file already exists and is valid
  if (options?.sha1 || options?.size) {
    const valid = await verifyFile(dest, options.sha1, options.size)
    if (valid) return
  }

  await ensureDir(dirname(dest))

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }

  if (!response.body) {
    throw new Error(`No response body: ${url}`)
  }

  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
  await pipeline(nodeStream, createWriteStream(dest))

  // Verify after download
  if (options?.sha1) {
    const valid = await verifyFile(dest, options.sha1, options.size)
    if (!valid) {
      throw new Error(`SHA-1 mismatch after download: ${url}`)
    }
  }
}
