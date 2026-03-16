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
import { readdir, readFile, writeFile, mkdir, unlink, rename, cp, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { homedir, platform } from 'node:os'
import type { DownloadProgress, GameProcess, LaunchOptions } from '@formallauncher/minecraft'
import { sha1File } from '@formallauncher/minecraft'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 700,
    minHeight: 500,
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
    'minecraft:install-modpack-from-file',
    async (_event, gameDir: string, instanceId: string, filePath: string) => {
      const { installModpackFromFile } = await import('@formallauncher/minecraft/fabric')
      return installModpackFromFile(gameDir, instanceId, filePath)
    },
  )

  ipcMain.handle('minecraft:select-mrpack-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select .mrpack File',
      filters: [{ name: 'Modrinth Modpacks', extensions: ['mrpack'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(
    'minecraft:apply-modpack-overrides',
    async (_event, extractedPath: string, instanceDir: string) => {
      const { applyModpackOverrides } = await import('@formallauncher/minecraft/fabric')
      return applyModpackOverrides(extractedPath, instanceDir)
    },
  )

  ipcMain.handle('minecraft:show-in-folder', async (_event, path: string) => {
    await shell.openPath(path)
  })

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
    'minecraft:set-skin-variant',
    async (_event, accessToken: string, skinUrl: string, variant: 'classic' | 'slim') => {
      const { setSkinVariant } = await import('@formallauncher/minecraft/skin')
      return setSkinVariant(accessToken, skinUrl, variant)
    },
  )

  ipcMain.handle(
    'minecraft:set-active-cape',
    async (_event, accessToken: string, capeId: string | null) => {
      const { setActiveCape } = await import('@formallauncher/minecraft/skin')
      return setActiveCape(accessToken, capeId)
    },
  )

  // ── Config File Sync ──

  const ALLOWED_CONFIG_EXTENSIONS = [
    '.json', '.toml', '.cfg', '.properties', '.yaml', '.yml', '.txt', '.conf', '.ini',
  ]
  const MAX_CONFIG_FILE_SIZE = 256 * 1024

  async function readConfigFiles(
    dir: string,
    basePath = '',
  ): Promise<{ filePath: string; content: string; hash: string }[]> {
    const results: { filePath: string; content: string; hash: string }[] = []
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return results
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = basePath ? `${basePath}/${entry}` : entry
      try {
        const s = await stat(fullPath)
        if (s.isDirectory()) {
          results.push(...(await readConfigFiles(fullPath, relativePath)))
        } else if (s.isFile()) {
          const ext = entry.slice(entry.lastIndexOf('.'))
          if (!ALLOWED_CONFIG_EXTENSIONS.includes(ext)) continue
          if (s.size > MAX_CONFIG_FILE_SIZE) continue
          const content = await readFile(fullPath, 'utf-8')
          const hash = createHash('sha256').update(content).digest('hex')
          results.push({ filePath: relativePath, content, hash })
        }
      } catch {
        continue
      }
    }
    return results
  }

  ipcMain.handle(
    'minecraft:read-instance-configs',
    async (_event, gameDir: string, instanceId: string) => {
      const configDir = join(gameDir, 'instances', instanceId, 'config')
      return readConfigFiles(configDir)
    },
  )

  ipcMain.handle(
    'minecraft:write-instance-configs',
    async (
      _event,
      gameDir: string,
      instanceId: string,
      configs: { filePath: string; content: string; hash: string }[],
    ) => {
      const configDir = join(gameDir, 'instances', instanceId, 'config')
      for (const config of configs) {
        const destPath = join(configDir, config.filePath)
        // Check if local file already matches
        try {
          const existing = await readFile(destPath, 'utf-8')
          const existingHash = createHash('sha256').update(existing).digest('hex')
          if (existingHash === config.hash) continue
        } catch {
          // File doesn't exist, will create
        }
        await mkdir(join(destPath, '..'), { recursive: true })
        await writeFile(destPath, config.content, 'utf-8')
      }
    },
  )

  // ── Prism Launcher Import ──

  async function findPrismGameDir(instanceDir: string): Promise<string> {
    for (const candidate of ['.minecraft', 'minecraft']) {
      try {
        const s = await stat(join(instanceDir, candidate))
        if (s.isDirectory()) return join(instanceDir, candidate)
      } catch { /* try next */ }
    }
    return instanceDir
  }

  async function scanPrismDir(dir: string) {
    const instances: {
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
    }[] = []

    let dirNames: string[]
    try {
      dirNames = await readdir(dir)
    } catch {
      return { found: false, path: null, instances: [] }
    }

    for (const dirName of dirNames) {
      const instanceDir = join(dir, dirName)
      try {
        const s = await stat(instanceDir)
        if (!s.isDirectory()) continue
      } catch {
        continue
      }
      try { await stat(join(instanceDir, 'instance.cfg')) } catch { continue }

      // Parse instance.cfg
      const cfg: Record<string, string> = {}
      try {
        const raw = await readFile(join(instanceDir, 'instance.cfg'), 'utf-8')
        for (const line of raw.split('\n')) {
          const idx = line.indexOf('=')
          if (idx > 0) cfg[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
        }
      } catch {
        continue
      }

      // Parse mmc-pack.json
      let mcVersion = ''
      let modLoader = 'vanilla'
      let modLoaderVersion: string | undefined

      try {
        const pack = JSON.parse(await readFile(join(instanceDir, 'mmc-pack.json'), 'utf-8'))
        for (const comp of pack.components ?? []) {
          const uid = comp.cachedName ? undefined : comp.uid ?? ''
          const id = comp.uid ?? uid ?? ''
          if (id === 'net.minecraft') {
            mcVersion = comp.version ?? ''
          } else if (id === 'net.fabricmc.fabric-loader') {
            modLoader = 'fabric'
            modLoaderVersion = comp.version
          } else if (id === 'org.quiltmc.quilt-loader') {
            modLoader = 'quilt'
            modLoaderVersion = comp.version
          } else if (id === 'net.minecraftforge') {
            modLoader = 'forge'
            modLoaderVersion = comp.version
          } else if (id === 'net.neoforged.neoforge') {
            modLoader = 'neoforge'
            modLoaderVersion = comp.version
          }
        }
      } catch {
        // No mmc-pack.json — skip
        continue
      }

      if (!mcVersion) continue

      // Count mods and resource packs
      let modCount = 0
      let resourcePackCount = 0
      const mcDir = await findPrismGameDir(instanceDir)
      try {
        modCount = (await readdir(join(mcDir, 'mods'))).filter(
          (f) => f.endsWith('.jar') || f.endsWith('.jar.disabled'),
        ).length
      } catch {
        /* no mods dir */
      }
      try {
        resourcePackCount = (await readdir(join(mcDir, 'resourcepacks'))).length
      } catch {
        /* no resourcepacks dir */
      }

      instances.push({
        dirName,
        name: cfg['name'] || dirName,
        minecraftVersion: mcVersion,
        modLoader,
        modLoaderVersion,
        modCount,
        resourcePackCount,
        ramMb: cfg['MaxMemAlloc'] ? parseInt(cfg['MaxMemAlloc'], 10) : undefined,
        jvmArgs: cfg['JvmArgs'] || undefined,
        javaPath: cfg['JavaPath'] || undefined,
      })
    }

    return { found: instances.length > 0, path: dir, instances }
  }

  function getDefaultPrismDir(): string {
    const p = platform()
    const home = homedir()
    if (p === 'darwin') return join(home, 'Library', 'Application Support', 'PrismLauncher', 'instances')
    if (p === 'win32') return join(process.env['APPDATA'] || join(home, 'AppData', 'Roaming'), 'PrismLauncher', 'instances')
    return join(home, '.local', 'share', 'PrismLauncher', 'instances')
  }

  ipcMain.handle('minecraft:scan-prism-instances', async (_event, dir?: string) => {
    const targetDir = dir || getDefaultPrismDir()
    return scanPrismDir(targetDir)
  })

  ipcMain.handle('minecraft:select-prism-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Prism Launcher instances folder',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { found: false, path: null, instances: [] }
    }
    return scanPrismDir(result.filePaths[0])
  })

  ipcMain.handle(
    'minecraft:import-prism-instance',
    async (_event, prismDir: string, instanceDirName: string, gameDir: string) => {
      const instanceId = crypto.randomUUID()
      await ensureInstanceDirs(gameDir, instanceId)

      const srcDir = join(prismDir, instanceDirName)
      const destDir = join(gameDir, 'instances', instanceId)
      const mcDir = await findPrismGameDir(srcDir)

      // Copy entire game directory contents
      await cp(mcDir, destDir, { recursive: true })

      // Parse instance.cfg
      const cfg: Record<string, string> = {}
      try {
        const raw = await readFile(join(srcDir, 'instance.cfg'), 'utf-8')
        for (const line of raw.split('\n')) {
          const idx = line.indexOf('=')
          if (idx > 0) cfg[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
        }
      } catch {
        /* */
      }

      // Parse mmc-pack.json
      let mcVersion = ''
      let modLoader = 'vanilla'
      let modLoaderVersion: string | undefined

      try {
        const pack = JSON.parse(await readFile(join(srcDir, 'mmc-pack.json'), 'utf-8'))
        for (const comp of pack.components ?? []) {
          const id = comp.uid ?? ''
          if (id === 'net.minecraft') mcVersion = comp.version ?? ''
          else if (id === 'net.fabricmc.fabric-loader') {
            modLoader = 'fabric'
            modLoaderVersion = comp.version
          } else if (id === 'org.quiltmc.quilt-loader') {
            modLoader = 'quilt'
            modLoaderVersion = comp.version
          } else if (id === 'net.minecraftforge') {
            modLoader = 'forge'
            modLoaderVersion = comp.version
          } else if (id === 'net.neoforged.neoforge') {
            modLoader = 'neoforge'
            modLoaderVersion = comp.version
          }
        }
      } catch {
        /* */
      }

      // Install Fabric if applicable
      let effectiveVersionId: string | undefined
      if (modLoader === 'fabric' && mcVersion) {
        try {
          const { installFabric } = await import('@formallauncher/minecraft/fabric')
          effectiveVersionId = await installFabric(gameDir, mcVersion, modLoaderVersion)
        } catch {
          /* Fabric install failed — instance still usable */
        }
      }

      // Build mod entries from copied mods dir
      const mods: { projectId: string; versionId: string; name: string; fileName: string; enabled: boolean }[] = []
      try {
        const modFiles = await readdir(join(destDir, 'mods'))
        for (const f of modFiles) {
          if (!f.endsWith('.jar') && !f.endsWith('.jar.disabled')) continue
          const enabled = !f.endsWith('.disabled')
          const displayName = f.replace(/\.jar(\.disabled)?$/, '')
          const hash = await sha1File(join(destDir, 'mods', f))
          mods.push({
            projectId: hash,
            versionId: '',
            name: displayName,
            fileName: f,
            enabled,
          })
        }
      } catch {
        /* no mods */
      }

      // Build resource pack entries
      const resourcePacks: { projectId: string; versionId: string; name: string; fileName: string }[] = []
      try {
        const rpFiles = await readdir(join(destDir, 'resourcepacks'))
        for (const f of rpFiles) {
          const hash = await sha1File(join(destDir, 'resourcepacks', f))
          resourcePacks.push({
            projectId: hash,
            versionId: '',
            name: f.replace(/\.zip$/, ''),
            fileName: f,
          })
        }
      } catch {
        /* no resource packs */
      }

      // Read instance icon
      let iconUrl: string | undefined
      try {
        const iconData = await readFile(join(mcDir, 'icon.png'))
        iconUrl = `data:image/png;base64,${iconData.toString('base64')}`
      } catch { /* no icon */ }

      return {
        id: instanceId,
        name: cfg['name'] || instanceDirName,
        minecraftVersion: mcVersion,
        modLoader,
        modLoaderVersion,
        effectiveVersionId,
        mods,
        resourcePacks,
        iconUrl,
        ramMb: cfg['MaxMemAlloc'] ? parseInt(cfg['MaxMemAlloc'], 10) : undefined,
        javaPath: cfg['JavaPath'] || undefined,
        jvmArgs: cfg['JvmArgs'] || undefined,
      }
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
