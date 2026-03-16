import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const platformAPI = {
  platform: process.platform as 'darwin' | 'win32' | 'linux',
}

const minecraftAPI = {
  getVersions: () => ipcRenderer.invoke('minecraft:get-versions'),
  downloadGame: (gameDir: string, versionId: string) =>
    ipcRenderer.invoke('minecraft:download-game', gameDir, versionId),
  launch: (options: {
    versionId: string
    gameDir: string
    auth: { id: string; name: string; accessToken: string }
    instanceId?: string
    javaPath?: string
    jvmArgs?: string[]
    ramMb?: number
  }) => ipcRenderer.invoke('minecraft:launch', options),
  kill: () => ipcRenderer.invoke('minecraft:kill'),
  authLogin: (cacheDir: string) => ipcRenderer.invoke('minecraft:auth-login', cacheDir),
  authRefresh: (cacheDir: string) => ipcRenderer.invoke('minecraft:auth-refresh', cacheDir),
  getDefaultGameDir: () => ipcRenderer.invoke('minecraft:get-default-game-dir'),

  // Instance management
  ensureInstanceDirs: (gameDir: string, instanceId: string) =>
    ipcRenderer.invoke('minecraft:ensure-instance-dirs', gameDir, instanceId),

  // File operations
  downloadFile: (url: string, destPath: string, sha1?: string) =>
    ipcRenderer.invoke('minecraft:download-file', url, destPath, sha1),
  deleteFile: (path: string) => ipcRenderer.invoke('minecraft:delete-file', path),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('minecraft:rename-file', oldPath, newPath),
  listDir: (dirPath: string) => ipcRenderer.invoke('minecraft:list-dir', dirPath) as Promise<string[]>,

  // Fabric
  getFabricVersions: (mcVersion: string) =>
    ipcRenderer.invoke('minecraft:get-fabric-versions', mcVersion),
  installFabric: (gameDir: string, mcVersion: string, loaderVersion?: string) =>
    ipcRenderer.invoke('minecraft:install-fabric', gameDir, mcVersion, loaderVersion) as Promise<string>,

  // Modpack
  installModpack: (gameDir: string, instanceId: string, modpackFileUrl: string) =>
    ipcRenderer.invoke('minecraft:install-modpack', gameDir, instanceId, modpackFileUrl),
  installModpackFromFile: (gameDir: string, instanceId: string, filePath: string) =>
    ipcRenderer.invoke('minecraft:install-modpack-from-file', gameDir, instanceId, filePath),
  selectMrpackFile: () =>
    ipcRenderer.invoke('minecraft:select-mrpack-file') as Promise<string | null>,
  applyModpackOverrides: (extractedPath: string, instanceDir: string) =>
    ipcRenderer.invoke('minecraft:apply-modpack-overrides', extractedPath, instanceDir),

  // Show in folder
  showInFolder: (path: string) => ipcRenderer.invoke('minecraft:show-in-folder', path),

  // Image proxy (bypasses renderer CSP)
  fetchImage: (url: string) =>
    ipcRenderer.invoke('minecraft:fetch-image', url) as Promise<string>,

  // Skin
  getSkinProfile: (accessToken: string) =>
    ipcRenderer.invoke('minecraft:get-skin-profile', accessToken),
  uploadSkin: (accessToken: string, variant: 'classic' | 'slim') =>
    ipcRenderer.invoke('minecraft:upload-skin', accessToken, variant),
  setSkinVariant: (accessToken: string, skinUrl: string, variant: 'classic' | 'slim') =>
    ipcRenderer.invoke('minecraft:set-skin-variant', accessToken, skinUrl, variant),
  setActiveCape: (accessToken: string, capeId: string | null) =>
    ipcRenderer.invoke('minecraft:set-active-cape', accessToken, capeId),

  // Config file sync
  readInstanceConfigs: (gameDir: string, instanceId: string) =>
    ipcRenderer.invoke('minecraft:read-instance-configs', gameDir, instanceId) as Promise<
      { filePath: string; content: string; hash: string }[]
    >,
  writeInstanceConfigs: (
    gameDir: string,
    instanceId: string,
    configs: { filePath: string; content: string; hash: string }[],
  ) => ipcRenderer.invoke('minecraft:write-instance-configs', gameDir, instanceId, configs),

  // Prism Launcher import
  scanPrismInstances: (dir?: string) =>
    ipcRenderer.invoke('minecraft:scan-prism-instances', dir),
  selectPrismDirectory: () =>
    ipcRenderer.invoke('minecraft:select-prism-directory'),
  importPrismInstance: (prismDir: string, instanceDirName: string, gameDir: string) =>
    ipcRenderer.invoke('minecraft:import-prism-instance', prismDir, instanceDirName, gameDir),

  // Event listeners
  onDownloadProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown): void => callback(progress)
    ipcRenderer.on('minecraft:download-progress', handler)
    return () => ipcRenderer.removeListener('minecraft:download-progress', handler)
  },
  onDeviceCode: (callback: (code: unknown) => void) => {
    const handler = (_event: unknown, code: unknown): void => callback(code)
    ipcRenderer.on('minecraft:device-code', handler)
    return () => ipcRenderer.removeListener('minecraft:device-code', handler)
  },
  onStdout: (callback: (data: string) => void) => {
    const handler = (_event: unknown, data: string): void => callback(data)
    ipcRenderer.on('minecraft:stdout', handler)
    return () => ipcRenderer.removeListener('minecraft:stdout', handler)
  },
  onStderr: (callback: (data: string) => void) => {
    const handler = (_event: unknown, data: string): void => callback(data)
    ipcRenderer.on('minecraft:stderr', handler)
    return () => ipcRenderer.removeListener('minecraft:stderr', handler)
  },
  onExit: (callback: (code: number | null) => void) => {
    const handler = (_event: unknown, code: number | null): void => callback(code)
    ipcRenderer.on('minecraft:exit', handler)
    return () => ipcRenderer.removeListener('minecraft:exit', handler)
  },
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('minecraft', minecraftAPI)
  contextBridge.exposeInMainWorld('platform', platformAPI)
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error - fallback for non-isolated context
  window.minecraft = minecraftAPI
  window.platform = platformAPI
}
