import type { VersionManifest } from '../types'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

export async function fetchVersionManifest(): Promise<VersionManifest> {
  const response = await fetch(MANIFEST_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch version manifest: ${response.status}`)
  }
  return response.json() as Promise<VersionManifest>
}
