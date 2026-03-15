import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { getVersionDir, ensureDir } from '../utils/paths'
import { fetchVersionManifest } from './manifest'
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

export async function loadAndMergeVersionJson(
  gameDir: string,
  versionId: string,
): Promise<VersionJson | null> {
  const child = await loadCachedVersionJson(gameDir, versionId)
  if (!child) return null

  if (!child.inheritsFrom) return child

  // Load or fetch the parent vanilla version
  let parent = await loadCachedVersionJson(gameDir, child.inheritsFrom)
  if (!parent) {
    const manifest = await fetchVersionManifest()
    const entry = manifest.versions.find((v) => v.id === child.inheritsFrom)
    if (!entry) {
      throw new Error(`Parent version ${child.inheritsFrom} not found in manifest`)
    }
    parent = await fetchVersionJson(entry.url)
    await saveVersionJson(gameDir, child.inheritsFrom, parent)
  }

  // Merge: parent as base, child overrides
  const merged: VersionJson = {
    ...parent,
    ...child,
    libraries: [...child.libraries, ...parent.libraries],
    downloads: parent.downloads,
    assetIndex: parent.assetIndex,
    assets: parent.assets,
  }

  // Merge arguments arrays
  if (parent.arguments || child.arguments) {
    merged.arguments = {
      game: [
        ...(child.arguments?.game ?? []),
        ...(parent.arguments?.game ?? []),
      ],
      jvm: [
        ...(child.arguments?.jvm ?? []),
        ...(parent.arguments?.jvm ?? []),
      ],
    }
  }

  return merged
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
