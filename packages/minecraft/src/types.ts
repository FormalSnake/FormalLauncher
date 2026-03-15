import type { ChildProcess } from 'node:child_process'
import type { EventEmitter } from 'node:events'

// ── Authentication ──

export interface MinecraftAccount {
  id: string
  name: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

// ── Version Manifest ──

export interface VersionManifestEntry {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  url: string
  time: string
  releaseTime: string
  sha1: string
  complianceLevel: number
}

export interface VersionManifest {
  latest: {
    release: string
    snapshot: string
  }
  versions: VersionManifestEntry[]
}

// ── Version JSON ──

export interface DownloadInfo {
  sha1: string
  size: number
  url: string
}

export interface Rule {
  action: 'allow' | 'disallow'
  os?: {
    name?: string
    arch?: string
    version?: string
  }
  features?: Record<string, boolean>
}

export interface LibraryDownloads {
  artifact?: DownloadInfo & { path: string }
  classifiers?: Record<string, DownloadInfo & { path: string }>
}

export interface LibraryEntry {
  name: string
  downloads?: LibraryDownloads
  url?: string
  rules?: Rule[]
  natives?: Record<string, string>
  extract?: { exclude?: string[] }
}

export interface ArgumentEntry {
  rules?: Rule[]
  value: string | string[]
}

export interface AssetIndex {
  id: string
  sha1: string
  size: number
  totalSize: number
  url: string
}

export interface VersionJson {
  id: string
  type: string
  mainClass: string
  inheritsFrom?: string
  minecraftArguments?: string
  arguments?: {
    game: (string | ArgumentEntry)[]
    jvm: (string | ArgumentEntry)[]
  }
  libraries: LibraryEntry[]
  downloads: {
    client: DownloadInfo
    server?: DownloadInfo
  }
  assetIndex: AssetIndex
  assets: string
  javaVersion?: {
    component: string
    majorVersion: number
  }
  logging?: {
    client?: {
      argument: string
      file: DownloadInfo & { id: string }
      type: string
    }
  }
}

// ── Asset Index File ──

export interface AssetIndexFile {
  objects: Record<string, { hash: string; size: number }>
}

// ── Download Progress ──

export interface DownloadProgress {
  phase: 'version-json' | 'client-jar' | 'libraries' | 'assets' | 'java-runtime'
  current: number
  total: number
  fileName?: string
}

// ── Launch ──

export interface LaunchOptions {
  versionId: string
  gameDir: string
  auth: MinecraftAccount
  instanceId?: string
  javaPath?: string
  jvmArgs?: string[]
  ramMb?: number
  onProgress?: (progress: DownloadProgress) => void
}

export interface ResolvedLibrary {
  path: string
  url: string
  sha1?: string
  size?: number
  isNative: boolean
  extractExclude?: string[]
  name: string
}

export interface GameProcess {
  pid: number | undefined
  on(event: 'stdout', listener: (data: string) => void): void
  on(event: 'stderr', listener: (data: string) => void): void
  on(event: 'exit', listener: (code: number | null) => void): void
  kill(): void
}

// ── Skin / Cape ──

export interface MinecraftSkin {
  id: string
  state: 'ACTIVE' | 'INACTIVE'
  url: string
  variant: 'CLASSIC' | 'SLIM'
}

export interface MinecraftCape {
  id: string
  state: 'ACTIVE' | 'INACTIVE'
  url: string
  alias: string
}

export interface MinecraftProfileFull {
  id: string
  name: string
  skins: MinecraftSkin[]
  capes: MinecraftCape[]
}

// ── Platform ──

export type MojangOS = 'osx' | 'windows' | 'linux'
export type MojangArch = 'x86' | 'x86_64' | 'arm64'
