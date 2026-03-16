import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { getVersionDir, getLibrariesDir, ensureDir, getInstanceDir } from '../utils/paths'
import { downloadFile } from '../download/downloader'

const FABRIC_META = 'https://meta.fabricmc.net/v2'

export interface FabricLoaderVersion {
  separator: string
  build: number
  maven: string
  version: string
  stable: boolean
}

interface FabricProfileLibrary {
  name: string
  url: string
  sha1?: string
  size?: number
}

interface FabricProfileJson {
  id: string
  type: string
  mainClass: string
  inheritsFrom: string
  arguments: {
    game: string[]
    jvm: string[]
  }
  libraries: FabricProfileLibrary[]
}

export async function fetchFabricLoaderVersions(
  mcVersion: string,
): Promise<FabricLoaderVersion[]> {
  const res = await fetch(`${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}`)
  if (!res.ok) throw new Error(`Fabric meta API error: ${res.status}`)
  const data = (await res.json()) as { loader: FabricLoaderVersion }[]
  return data.map((entry) => entry.loader)
}

export async function getLatestFabricLoader(
  mcVersion: string,
): Promise<FabricLoaderVersion | null> {
  const loaders = await fetchFabricLoaderVersions(mcVersion)
  return loaders.find((l) => l.stable) ?? loaders[0] ?? null
}

async function fetchFabricProfileJson(
  mcVersion: string,
  loaderVersion: string,
): Promise<FabricProfileJson> {
  const res = await fetch(
    `${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`,
  )
  if (!res.ok) throw new Error(`Fabric profile JSON error: ${res.status}`)
  return res.json() as Promise<FabricProfileJson>
}

function mavenToPath(maven: string): string {
  const parts = maven.split(':')
  const group = parts[0].replaceAll('.', '/')
  const artifact = parts[1]
  const version = parts[2]
  return `${group}/${artifact}/${version}/${artifact}-${version}.jar`
}

export async function installFabric(
  gameDir: string,
  mcVersion: string,
  loaderVersion?: string,
): Promise<string> {
  if (!loaderVersion) {
    const latest = await getLatestFabricLoader(mcVersion)
    if (!latest) throw new Error(`No Fabric loader found for ${mcVersion}`)
    loaderVersion = latest.version
  }

  const profile = await fetchFabricProfileJson(mcVersion, loaderVersion)
  const versionId = profile.id

  // Save the version JSON
  const versionDir = getVersionDir(gameDir, versionId)
  await ensureDir(versionDir)
  await writeFile(join(versionDir, `${versionId}.json`), JSON.stringify(profile, null, 2))

  // Download Fabric libraries
  const libDir = getLibrariesDir(gameDir)
  for (const lib of profile.libraries) {
    const path = mavenToPath(lib.name)
    const dest = join(libDir, path)
    const url = lib.url.endsWith('/') ? `${lib.url}${path}` : `${lib.url}/${path}`
    await downloadFile(url, dest, lib.sha1 ? { sha1: lib.sha1 } : undefined)
  }

  return versionId
}

// ── Modpack support ──

interface MrpackIndex {
  formatVersion: number
  game: string
  versionId: string
  name: string
  dependencies: Record<string, string>
  files: {
    path: string
    hashes: { sha1: string; sha512?: string }
    env?: { client: string; server: string }
    downloads: string[]
    fileSize: number
  }[]
}

export interface ModpackManifest {
  gameVersion: string
  dependencies: Record<string, string>
  files: { path: string; hashes: { sha1: string }; downloads: string[]; fileSize: number }[]
  overridesDir: string | null
  extractedPath: string
}

async function _parseExtractedModpack(
  instanceId: string,
  zipPath: string,
): Promise<ModpackManifest> {
  const { default: AdmZip } = await import('adm-zip')

  const extractedPath = join(tmpdir(), `modpack-${instanceId}-extracted`)
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(extractedPath, true)

  const indexEntry = zip.getEntry('modrinth.index.json')
  if (!indexEntry) throw new Error('Invalid mrpack: missing modrinth.index.json')
  const index: MrpackIndex = JSON.parse(indexEntry.getData().toString('utf8'))

  const overridesDir = zip.getEntry('overrides/') ? join(extractedPath, 'overrides') : null

  return {
    gameVersion: index.dependencies['minecraft'] ?? '',
    dependencies: index.dependencies,
    files: index.files
      .filter((f) => !f.env || f.env.client !== 'unsupported')
      .map((f) => ({
        path: f.path,
        hashes: { sha1: f.hashes.sha1 },
        downloads: f.downloads,
        fileSize: f.fileSize,
      })),
    overridesDir,
    extractedPath,
  }
}

export async function installModpack(
  gameDir: string,
  instanceId: string,
  modpackFileUrl: string,
): Promise<ModpackManifest> {
  // Download .mrpack to temp
  const tmpPath = join(tmpdir(), `modpack-${instanceId}.mrpack`)
  const response = await fetch(modpackFileUrl)
  if (!response.ok) throw new Error(`Failed to download modpack: ${response.status}`)
  if (!response.body) throw new Error('No response body for modpack download')
  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)
  await pipeline(nodeStream, createWriteStream(tmpPath))

  return _parseExtractedModpack(instanceId, tmpPath)
}

export async function installModpackFromFile(
  gameDir: string,
  instanceId: string,
  filePath: string,
): Promise<ModpackManifest> {
  return _parseExtractedModpack(instanceId, filePath)
}

export async function applyModpackOverrides(
  extractedPath: string,
  instanceDir: string,
): Promise<void> {
  const overridesPath = join(extractedPath, 'overrides')
  try {
    await cp(overridesPath, instanceDir, { recursive: true })
  } catch {
    // No overrides directory — that's fine
  }
}
