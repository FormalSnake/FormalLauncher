import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  fetchVersionManifest,
  downloadGameFiles,
  launchMinecraft,
  loginWithMicrosoft,
  refreshAuth,
  getDefaultGameDir,
} from '@formallauncher/minecraft'
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
    const process = await launchMinecraft(options)

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
