export interface MinecraftAccount {
  id: string
  name: string
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

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

export interface DownloadProgress {
  phase: 'version-json' | 'client-jar' | 'libraries' | 'assets' | 'java-runtime'
  current: number
  total: number
  fileName?: string
}

export interface DeviceCodeInfo {
  userCode: string
  verificationUri: string
  expiresIn: number
}

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
