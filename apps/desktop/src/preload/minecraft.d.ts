import type {
  VersionManifest,
  MinecraftAccount,
  MinecraftProfileFull,
  DownloadProgress,
  LaunchOptions,
} from '@formallauncher/minecraft'
import type { Instance } from '@formallauncher/shared'

interface PrismInstanceInfo {
  dirName: string
  name: string
  minecraftVersion: string
  modLoader: string
  modLoaderVersion?: string
  modCount: number
  resourcePackCount: number
  ramMb?: number
  jvmArgs?: string
  javaPath?: string
}

interface PrismScanResult {
  found: boolean
  path: string | null
  instances: PrismInstanceInfo[]
}

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
  installModpackFromFile(
    gameDir: string,
    instanceId: string,
    filePath: string,
  ): Promise<ModpackManifest>
  selectMrpackFile(): Promise<string | null>
  applyModpackOverrides(extractedPath: string, instanceDir: string): Promise<void>

  // Show in folder
  showInFolder(path: string): Promise<void>

  // Image proxy (bypasses renderer CSP)
  fetchImage(url: string): Promise<string | null>

  // Skin
  getSkinProfile(accessToken: string): Promise<MinecraftProfileFull>
  uploadSkin(accessToken: string, variant: 'classic' | 'slim'): Promise<boolean | null>
  setSkinVariant(accessToken: string, skinUrl: string, variant: 'classic' | 'slim'): Promise<void>
  setActiveCape(accessToken: string, capeId: string | null): Promise<void>

  // Config file sync
  readInstanceConfigs(
    gameDir: string,
    instanceId: string,
  ): Promise<{ filePath: string; content: string; hash: string }[]>
  writeInstanceConfigs(
    gameDir: string,
    instanceId: string,
    configs: { filePath: string; content: string; hash: string }[],
  ): Promise<void>

  // Prism Launcher import
  scanPrismInstances(dir?: string): Promise<PrismScanResult>
  selectPrismDirectory(): Promise<PrismScanResult>
  importPrismInstance(prismDir: string, instanceDirName: string, gameDir: string): Promise<Instance>

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
