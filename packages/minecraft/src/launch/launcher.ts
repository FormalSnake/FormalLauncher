import { spawn } from 'node:child_process'
import { loadCachedVersionJson } from '../versions/version-json'
import { resolveLibraries } from '../download/libraries'
import { extractNatives } from './natives'
import { buildClasspath, buildJvmArgs, buildGameArgs } from './arguments'
import { resolveJava } from './java-resolver'
import { ensureInstanceDirs, getInstanceDir } from '../utils/paths'
import type { LaunchOptions, GameProcess } from '../types'

export async function launchMinecraft(options: LaunchOptions): Promise<GameProcess> {
  const { versionId, gameDir, auth, instanceId, javaPath, jvmArgs, ramMb = 2048 } = options

  if (instanceId) {
    await ensureInstanceDirs(gameDir, instanceId)
  }

  // Load version JSON (must be downloaded already)
  const versionJson = await loadCachedVersionJson(gameDir, versionId)
  if (!versionJson) {
    throw new Error(`Version ${versionId} not downloaded. Run downloadGameFiles first.`)
  }

  // Resolve Java path: use explicit path if provided, otherwise auto-detect/download
  let resolvedJavaPath = javaPath
  if (!resolvedJavaPath || resolvedJavaPath === 'java') {
    resolvedJavaPath = await resolveJava(gameDir, versionJson, options.onProgress)
  }

  // Resolve libraries and extract natives
  const libraries = resolveLibraries(versionJson.libraries)
  const nativesDir = await extractNatives(gameDir, versionId, libraries)
  const classpath = buildClasspath(gameDir, versionId, libraries)

  const ctx = {
    versionJson,
    gameDir,
    instanceId,
    auth,
    nativesDir,
    classpath,
    ramMb,
    jvmArgs,
  }

  // Build full command arguments
  const fullArgs = [...buildJvmArgs(ctx), versionJson.mainClass, ...buildGameArgs(ctx)]

  // Spawn Java process
  const cwd = instanceId ? getInstanceDir(gameDir, instanceId) : gameDir
  const child = spawn(resolvedJavaPath, fullArgs, {
    cwd,
    detached: true,
  })

  const listeners: {
    stdout: ((data: string) => void)[]
    stderr: ((data: string) => void)[]
    exit: ((code: number | null) => void)[]
  } = { stdout: [], stderr: [], exit: [] }

  child.stdout?.on('data', (data: Buffer) => {
    const str = data.toString()
    listeners.stdout.forEach((fn) => fn(str))
  })

  child.stderr?.on('data', (data: Buffer) => {
    const str = data.toString()
    listeners.stderr.forEach((fn) => fn(str))
  })

  child.on('exit', (code) => {
    listeners.exit.forEach((fn) => fn(code))
  })

  return {
    pid: child.pid,
    on(event, listener) {
      listeners[event].push(listener as never)
    },
    kill() {
      child.kill()
    },
  }
}
