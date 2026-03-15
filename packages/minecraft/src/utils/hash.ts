import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

export async function sha1File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    const stream = createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function verifyFile(
  filePath: string,
  expectedSha1?: string,
  expectedSize?: number,
): Promise<boolean> {
  try {
    const stats = await stat(filePath)
    if (expectedSize !== undefined && stats.size !== expectedSize) return false
    if (expectedSha1) {
      const hash = await sha1File(filePath)
      return hash === expectedSha1
    }
    return true
  } catch {
    return false
  }
}
