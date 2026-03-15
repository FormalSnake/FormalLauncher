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
  phase: 'version-json' | 'client-jar' | 'libraries' | 'assets'
  current: number
  total: number
  fileName?: string
}

export interface DeviceCodeInfo {
  userCode: string
  verificationUri: string
  expiresIn: number
}
