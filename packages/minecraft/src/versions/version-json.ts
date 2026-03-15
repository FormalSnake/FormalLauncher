import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { getVersionDir, ensureDir } from '../utils/paths'
import type { VersionJson } from '../types'

export async function fetchVersionJson(url: string): Promise<VersionJson> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch version JSON: ${response.status}`)
  }
  return response.json() as Promise<VersionJson>
}

export async function loadCachedVersionJson(
  gameDir: string,
  versionId: string,
): Promise<VersionJson | null> {
  try {
    const filePath = join(getVersionDir(gameDir, versionId), `${versionId}.json`)
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data) as VersionJson
  } catch {
    return null
  }
}

export async function saveVersionJson(
  gameDir: string,
  versionId: string,
  data: VersionJson,
): Promise<void> {
  const dir = getVersionDir(gameDir, versionId)
  await ensureDir(dir)
  await writeFile(join(dir, `${versionId}.json`), JSON.stringify(data, null, 2))
}
