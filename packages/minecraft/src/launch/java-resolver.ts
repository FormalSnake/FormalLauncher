import { readdir, chmod, access, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir, platform, arch } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { downloadFile } from '../download/downloader'
import { ensureDir } from '../utils/paths'
import type { VersionJson, DownloadProgress } from '../types'

const execFileAsync = promisify(execFile)

export interface DetectedJava {
  path: string
  majorVersion: number
}

// Process-lifetime cache
let cachedSystemJavas: DetectedJava[] | null = null

async function parseJavaVersion(javaPath: string): Promise<number | null> {
  try {
    const { stderr } = await execFileAsync(javaPath, ['-version'], {
      timeout: 5000,
    })
    // java -version outputs to stderr, format: "21.0.1" or "1.8.0_392"
    const match = stderr.match(/"(\d+)(?:\.(\d+))?/)
    if (!match) return null
    const major = parseInt(match[1], 10)
    // 1.x.y format means major = x (e.g. 1.8 → 8)
    if (major === 1 && match[2]) return parseInt(match[2], 10)
    return major
  } catch {
    return null
  }
}

async function findJavasInDir(parentDir: string, suffix: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await readdir(parentDir)
    for (const entry of entries) {
      const javaPath = join(parentDir, entry, suffix)
      try {
        await access(javaPath)
        results.push(javaPath)
      } catch {
        // not found, skip
      }
    }
  } catch {
    // dir doesn't exist, skip
  }
  return results
}

export async function detectSystemJava(): Promise<DetectedJava[]> {
  if (cachedSystemJavas) return cachedSystemJavas

  const candidates: string[] = []
  const os = platform()

  if (os === 'darwin') {
    // System JDKs
    candidates.push(
      ...(await findJavasInDir(
        '/Library/Java/JavaVirtualMachines',
        'Contents/Home/bin/java',
      )),
    )
    // SDKMAN
    candidates.push(
      ...(await findJavasInDir(
        join(homedir(), '.sdkman/candidates/java'),
        'bin/java',
      )),
    )
    // Homebrew versioned
    candidates.push(
      ...(await findJavasInDir('/opt/homebrew/opt', 'bin/java')),
    )
  } else if (os === 'linux') {
    candidates.push(
      ...(await findJavasInDir('/usr/lib/jvm', 'bin/java')),
    )
    candidates.push(
      ...(await findJavasInDir(
        join(homedir(), '.sdkman/candidates/java'),
        'bin/java',
      )),
    )
  } else if (os === 'win32') {
    candidates.push(
      ...(await findJavasInDir('C:\\Program Files\\Java', 'bin\\java.exe')),
    )
    candidates.push(
      ...(await findJavasInDir(
        'C:\\Program Files\\Eclipse Adoptium',
        'bin\\java.exe',
      )),
    )
  }

  const detected: DetectedJava[] = []
  await Promise.all(
    candidates.map(async (path) => {
      const majorVersion = await parseJavaVersion(path)
      if (majorVersion) detected.push({ path, majorVersion })
    }),
  )

  cachedSystemJavas = detected
  return detected
}

function getMojangPlatformKey(): string {
  const os = platform()
  const cpuArch = arch()

  if (os === 'darwin') return cpuArch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
  if (os === 'linux') return cpuArch === 'x86' ? 'linux-i386' : 'linux'
  if (os === 'win32') {
    if (cpuArch === 'arm64') return 'windows-arm64'
    return cpuArch === 'x86' ? 'windows-x86' : 'windows-x64'
  }
  return 'linux'
}

function getManagedJavaBinPath(gameDir: string, component: string): string {
  const os = platform()
  if (os === 'darwin') {
    return join(
      gameDir, 'runtime', component, 'jre.bundle', 'Contents', 'Home', 'bin', 'java',
    )
  }
  if (os === 'win32') {
    return join(gameDir, 'runtime', component, 'bin', 'java.exe')
  }
  return join(gameDir, 'runtime', component, 'bin', 'java')
}

export async function getManagedJavaPath(
  gameDir: string,
  component: string,
): Promise<string | null> {
  const javaPath = getManagedJavaBinPath(gameDir, component)
  try {
    await access(javaPath)
    return javaPath
  } catch {
    return null
  }
}

interface RuntimeManifestFile {
  type: 'file' | 'directory' | 'link'
  downloads?: {
    raw?: { url: string; sha1: string; size: number }
    lzma?: { url: string; sha1: string; size: number }
  }
  executable?: boolean
  target?: string
}

export async function downloadManagedJava(
  gameDir: string,
  component: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  const platformKey = getMojangPlatformKey()
  const runtimeDir = join(gameDir, 'runtime', component)
  await ensureDir(runtimeDir)

  // Fetch runtime index
  const indexResp = await fetch(
    'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json',
  )
  if (!indexResp.ok) throw new Error(`Failed to fetch Java runtime index: ${indexResp.status}`)
  const index = await indexResp.json()

  const platformRuntimes = index[platformKey]
  if (!platformRuntimes?.[component]?.[0]) {
    throw new Error(`No managed Java runtime found for ${platformKey}/${component}`)
  }

  const manifestUrl = platformRuntimes[component][0].manifest.url

  // Fetch manifest
  const manifestResp = await fetch(manifestUrl)
  if (!manifestResp.ok) throw new Error(`Failed to fetch Java manifest: ${manifestResp.status}`)
  const manifest = await manifestResp.json()

  const files = manifest.files as Record<string, RuntimeManifestFile>
  const fileEntries = Object.entries(files)

  // Count downloadable files for progress
  const downloadableFiles = fileEntries.filter(
    ([, f]) => f.type === 'file' && f.downloads?.raw,
  )
  let downloaded = 0

  for (const [path, file] of fileEntries) {
    const destPath = join(runtimeDir, path)

    if (file.type === 'directory') {
      await ensureDir(destPath)
    } else if (file.type === 'file' && file.downloads?.raw) {
      onProgress?.({
        phase: 'java-runtime',
        current: downloaded,
        total: downloadableFiles.length,
        fileName: path,
      })

      await downloadFile(file.downloads.raw.url, destPath, {
        sha1: file.downloads.raw.sha1,
        size: file.downloads.raw.size,
      })

      if (file.executable) {
        await chmod(destPath, 0o755)
      }

      downloaded++
    } else if (file.type === 'link' && file.target) {
      await ensureDir(join(destPath, '..'))
      try {
        await symlink(file.target, destPath)
      } catch {
        // symlink may already exist
      }
    }
  }

  onProgress?.({
    phase: 'java-runtime',
    current: downloadableFiles.length,
    total: downloadableFiles.length,
  })

  const javaPath = getManagedJavaBinPath(gameDir, component)
  await chmod(javaPath, 0o755).catch(() => {})
  return javaPath
}

export async function resolveJava(
  gameDir: string,
  versionJson: VersionJson,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  const { component, majorVersion } = versionJson.javaVersion ?? {}
  if (!component) return 'java'

  // 1. Check managed runtime (already downloaded)
  const managed = await getManagedJavaPath(gameDir, component)
  if (managed) return managed

  // 2. Scan system for matching Java
  const systemJavas = await detectSystemJava()
  const match = systemJavas.find((j) => j.majorVersion === majorVersion)
  if (match) return match.path

  // 3. Download managed runtime
  return downloadManagedJava(gameDir, component, onProgress)
}
