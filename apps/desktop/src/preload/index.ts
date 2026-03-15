import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const minecraftAPI = {
  getVersions: () => ipcRenderer.invoke('minecraft:get-versions'),
  downloadGame: (gameDir: string, versionId: string) =>
    ipcRenderer.invoke('minecraft:download-game', gameDir, versionId),
  launch: (options: {
    versionId: string
    gameDir: string
    auth: { id: string; name: string; accessToken: string }
    javaPath?: string
    jvmArgs?: string[]
    ramMb?: number
  }) => ipcRenderer.invoke('minecraft:launch', options),
  authLogin: (cacheDir: string) => ipcRenderer.invoke('minecraft:auth-login', cacheDir),
  authRefresh: (cacheDir: string) => ipcRenderer.invoke('minecraft:auth-refresh', cacheDir),
  getDefaultGameDir: () => ipcRenderer.invoke('minecraft:get-default-game-dir'),

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
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error - fallback for non-isolated context
  window.minecraft = minecraftAPI
}
