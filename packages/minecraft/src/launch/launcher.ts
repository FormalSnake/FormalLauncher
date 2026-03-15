import { spawn } from 'node:child_process'
import { loadCachedVersionJson } from '../versions/version-json'
import { resolveLibraries } from '../download/libraries'
import { extractNatives } from './natives'
import { buildClasspath, buildJvmArgs, buildGameArgs } from './arguments'
import type { LaunchOptions, GameProcess } from '../types'

export async function launchMinecraft(options: LaunchOptions): Promise<GameProcess> {
  const { versionId, gameDir, auth, javaPath = 'java', jvmArgs, ramMb = 2048 } = options

  // Load version JSON (must be downloaded already)
  const versionJson = await loadCachedVersionJson(gameDir, versionId)
  if (!versionJson) {
    throw new Error(`Version ${versionId} not downloaded. Run downloadGameFiles first.`)
  }

  // Resolve libraries and extract natives
  const libraries = resolveLibraries(versionJson.libraries)
  const nativesDir = await extractNatives(gameDir, versionId, libraries)
  const classpath = buildClasspath(gameDir, versionId, libraries)

  const ctx = {
    versionJson,
    gameDir,
    auth,
    nativesDir,
    classpath,
    ramMb,
    jvmArgs,
  }

  // Build full command arguments
  const fullArgs = [...buildJvmArgs(ctx), versionJson.mainClass, ...buildGameArgs(ctx)]

  // Spawn Java process
  const child = spawn(javaPath, fullArgs, {
    cwd: gameDir,
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
