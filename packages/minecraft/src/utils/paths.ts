import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import { mkdir } from 'node:fs/promises'

export function getDefaultGameDir(): string {
  switch (platform()) {
    case 'win32':
      return join(process.env['APPDATA'] ?? homedir(), '.minecraft')
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'minecraft')
    default:
      return join(homedir(), '.minecraft')
  }
}

export function getVersionDir(gameDir: string, versionId: string): string {
  return join(gameDir, 'versions', versionId)
}

export function getLibrariesDir(gameDir: string): string {
  return join(gameDir, 'libraries')
}

export function getAssetsDir(gameDir: string): string {
  return join(gameDir, 'assets')
}

export function getNativesDir(gameDir: string, versionId: string): string {
  return join(gameDir, 'versions', versionId, 'natives')
}

export function getInstanceDir(gameDir: string, instanceId: string): string {
  return join(gameDir, 'instances', instanceId)
}

export function getInstanceModsDir(gameDir: string, instanceId: string): string {
  return join(getInstanceDir(gameDir, instanceId), 'mods')
}

export function getInstanceResourcePacksDir(gameDir: string, instanceId: string): string {
  return join(getInstanceDir(gameDir, instanceId), 'resourcepacks')
}

export async function ensureInstanceDirs(gameDir: string, instanceId: string): Promise<void> {
  const instanceDir = getInstanceDir(gameDir, instanceId)
  await Promise.all([
    mkdir(join(instanceDir, 'mods'), { recursive: true }),
    mkdir(join(instanceDir, 'resourcepacks'), { recursive: true }),
    mkdir(join(instanceDir, 'config'), { recursive: true }),
    mkdir(join(instanceDir, 'saves'), { recursive: true }),
  ])
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}
