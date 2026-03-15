import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  fetchVersionManifest,
  downloadGameFiles,
  launchMinecraft,
  loginWithMicrosoft,
  refreshAuth,
  getDefaultGameDir,
  ensureInstanceDirs,
  downloadFile,
} from '@formallauncher/minecraft'
import { readdir, unlink, rename } from 'node:fs/promises'
import type { DownloadProgress, GameProcess, LaunchOptions } from '@formallauncher/minecraft'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 22 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Minecraft IPC Handlers ──

function setupMinecraftIPC(): void {
  ipcMain.handle('minecraft:get-versions', async () => {
    return fetchVersionManifest()
  })

  ipcMain.handle('minecraft:download-game', async (_event, gameDir: string, versionId: string) => {
    const onProgress = (progress: DownloadProgress): void => {
      mainWindow?.webContents.send('minecraft:download-progress', progress)
    }
    await downloadGameFiles(gameDir, versionId, onProgress)
  })

  ipcMain.handle('minecraft:launch', async (_event, options: LaunchOptions) => {
    const process = await launchMinecraft({
      ...options,
      onProgress: (progress) => {
        mainWindow?.webContents.send('minecraft:download-progress', progress)
      },
    })

    process.on('stdout', (data) => {
      mainWindow?.webContents.send('minecraft:stdout', data)
    })
    process.on('stderr', (data) => {
      mainWindow?.webContents.send('minecraft:stderr', data)
    })
    process.on('exit', (code) => {
      mainWindow?.webContents.send('minecraft:exit', code)
    })

    return { pid: process.pid }
  })

  ipcMain.handle('minecraft:auth-login', async (_event, cacheDir: string) => {
    return loginWithMicrosoft({
      cacheDir,
      onDeviceCode: (code) => {
        mainWindow?.webContents.send('minecraft:device-code', code)
      },
    })
  })

  ipcMain.handle('minecraft:auth-refresh', async (_event, cacheDir: string) => {
    return refreshAuth({ cacheDir })
  })

  ipcMain.handle('minecraft:get-default-game-dir', () => {
    return getDefaultGameDir()
  })

  ipcMain.handle(
    'minecraft:ensure-instance-dirs',
    async (_event, gameDir: string, instanceId: string) => {
      await ensureInstanceDirs(gameDir, instanceId)
    },
  )

  ipcMain.handle(
    'minecraft:download-file',
    async (_event, url: string, destPath: string, sha1?: string) => {
      await downloadFile(url, destPath, sha1 ? { sha1 } : undefined)
    },
  )

  ipcMain.handle('minecraft:delete-file', async (_event, path: string) => {
    await unlink(path)
  })

  ipcMain.handle(
    'minecraft:rename-file',
    async (_event, oldPath: string, newPath: string) => {
      await rename(oldPath, newPath)
    },
  )

  ipcMain.handle('minecraft:list-dir', async (_event, dirPath: string) => {
    try {
      return await readdir(dirPath)
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'minecraft:get-fabric-versions',
    async (_event, mcVersion: string) => {
      const { fetchFabricLoaderVersions } = await import('@formallauncher/minecraft/fabric')
      return fetchFabricLoaderVersions(mcVersion)
    },
  )

  ipcMain.handle(
    'minecraft:install-fabric',
    async (_event, gameDir: string, mcVersion: string, loaderVersion?: string) => {
      const { installFabric } = await import('@formallauncher/minecraft/fabric')
      return installFabric(gameDir, mcVersion, loaderVersion)
    },
  )

  ipcMain.handle(
    'minecraft:install-modpack',
    async (_event, gameDir: string, instanceId: string, modpackFileUrl: string) => {
      const { installModpack } = await import('@formallauncher/minecraft/fabric')
      return installModpack(gameDir, instanceId, modpackFileUrl)
    },
  )

  ipcMain.handle(
    'minecraft:apply-modpack-overrides',
    async (_event, extractedPath: string, instanceDir: string) => {
      const { applyModpackOverrides } = await import('@formallauncher/minecraft/fabric')
      return applyModpackOverrides(extractedPath, instanceDir)
    },
  )

  ipcMain.handle('minecraft:fetch-image', async (_event, url: string) => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const buffer = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') || 'image/png'
      return `data:${contentType};base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  })

  ipcMain.handle('minecraft:get-skin-profile', async (_event, accessToken: string) => {
    const { getFullProfile } = await import('@formallauncher/minecraft/skin')
    return getFullProfile(accessToken)
  })

  ipcMain.handle(
    'minecraft:upload-skin',
    async (_event, accessToken: string, variant: 'classic' | 'slim') => {
      const result = await dialog.showOpenDialog({
        title: 'Select Skin PNG',
        filters: [{ name: 'PNG Images', extensions: ['png'] }],
        properties: ['openFile'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const { uploadSkin } = await import('@formallauncher/minecraft/skin')
      await uploadSkin(accessToken, result.filePaths[0], variant)
      return true
    },
  )

  ipcMain.handle(
    'minecraft:set-active-cape',
    async (_event, accessToken: string, capeId: string | null) => {
      const { setActiveCape } = await import('@formallauncher/minecraft/skin')
      return setActiveCape(accessToken, capeId)
    },
  )
}

app.whenReady().then(() => {
  setupMinecraftIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
