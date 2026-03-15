import type {
  VersionManifest,
  MinecraftAccount,
  DownloadProgress,
  LaunchOptions,
} from '@formallauncher/minecraft'

interface FabricLoaderVersion {
  separator: string
  build: number
  maven: string
  version: string
  stable: boolean
}

interface ModpackManifest {
  gameVersion: string
  dependencies: Record<string, string>
  files: { path: string; hashes: { sha1: string }; downloads: string[]; fileSize: number }[]
  overridesDir: string | null
  extractedPath: string
}

interface MinecraftAPI {
  getVersions(): Promise<VersionManifest>
  downloadGame(gameDir: string, versionId: string): Promise<void>
  launch(options: LaunchOptions): Promise<{ pid: number | undefined }>
  authLogin(cacheDir: string): Promise<MinecraftAccount>
  authRefresh(cacheDir: string): Promise<MinecraftAccount>
  getDefaultGameDir(): Promise<string>

  // Instance management
  ensureInstanceDirs(gameDir: string, instanceId: string): Promise<void>

  // File operations
  downloadFile(url: string, destPath: string, sha1?: string): Promise<void>
  deleteFile(path: string): Promise<void>
  renameFile(oldPath: string, newPath: string): Promise<void>
  listDir(dirPath: string): Promise<string[]>

  // Fabric
  getFabricVersions(mcVersion: string): Promise<FabricLoaderVersion[]>
  installFabric(gameDir: string, mcVersion: string, loaderVersion?: string): Promise<string>

  // Modpack
  installModpack(
    gameDir: string,
    instanceId: string,
    modpackFileUrl: string,
  ): Promise<ModpackManifest>
  applyModpackOverrides(extractedPath: string, instanceDir: string): Promise<void>

  // Events
  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void
  onDeviceCode(
    callback: (code: { userCode: string; verificationUri: string; expiresIn: number }) => void,
  ): () => void
  onStdout(callback: (data: string) => void): () => void
  onStderr(callback: (data: string) => void): () => void
  onExit(callback: (code: number | null) => void): () => void
}

declare global {
  interface Window {
    minecraft: MinecraftAPI
  }
}
