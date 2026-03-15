import type {
  VersionManifest,
  MinecraftAccount,
  DownloadProgress,
  LaunchOptions,
} from '@formallauncher/minecraft'

interface MinecraftAPI {
  getVersions(): Promise<VersionManifest>
  downloadGame(gameDir: string, versionId: string): Promise<void>
  launch(options: LaunchOptions): Promise<{ pid: number | undefined }>
  authLogin(cacheDir: string): Promise<MinecraftAccount>
  authRefresh(cacheDir: string): Promise<MinecraftAccount>
  getDefaultGameDir(): Promise<string>

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
