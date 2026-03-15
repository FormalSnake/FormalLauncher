import { join } from 'node:path'
import { getLibrariesDir, getVersionDir, getAssetsDir, getNativesDir } from '../utils/paths'
import { getClasspathSeparator, evaluateRules } from '../utils/platform'
import type { VersionJson, MinecraftAccount, ResolvedLibrary, ArgumentEntry } from '../types'

interface ArgContext {
  versionJson: VersionJson
  gameDir: string
  auth: MinecraftAccount
  nativesDir: string
  classpath: string
  ramMb: number
  jvmArgs?: string[]
}

export function buildClasspath(
  gameDir: string,
  versionId: string,
  libraries: ResolvedLibrary[],
): string {
  const sep = getClasspathSeparator()
  const libDir = getLibrariesDir(gameDir)

  const paths = libraries
    .filter((lib) => !lib.isNative)
    .map((lib) => join(libDir, lib.path))

  // Add client JAR
  paths.push(join(getVersionDir(gameDir, versionId), `${versionId}.jar`))

  return paths.join(sep)
}

export function buildJvmArgs(ctx: ArgContext): string[] {
  const args: string[] = []

  // Memory
  args.push(`-Xmx${ctx.ramMb}M`)
  args.push(`-Xms${Math.min(ctx.ramMb, 512)}M`)

  // Natives
  args.push(`-Djava.library.path=${ctx.nativesDir}`)

  // Classpath
  args.push('-cp', ctx.classpath)

  // Custom JVM args
  if (ctx.jvmArgs) {
    args.push(...ctx.jvmArgs)
  }

  // Modern arguments format (1.13+)
  if (ctx.versionJson.arguments?.jvm) {
    const resolved = resolveArguments(ctx.versionJson.arguments.jvm, ctx)
    args.push(...resolved)
  }

  return args
}

export function buildGameArgs(ctx: ArgContext): string[] {
  // Legacy format (pre-1.13)
  if (ctx.versionJson.minecraftArguments) {
    return substituteVars(ctx.versionJson.minecraftArguments.split(' '), ctx)
  }

  // Modern format (1.13+)
  if (ctx.versionJson.arguments?.game) {
    return resolveArguments(ctx.versionJson.arguments.game, ctx)
  }

  return []
}

function resolveArguments(
  entries: (string | ArgumentEntry)[],
  ctx: ArgContext,
): string[] {
  const result: string[] = []

  for (const entry of entries) {
    if (typeof entry === 'string') {
      result.push(substituteVar(entry, ctx))
    } else {
      if (!evaluateRules(entry.rules)) continue
      const values = Array.isArray(entry.value) ? entry.value : [entry.value]
      result.push(...values.map((v) => substituteVar(v, ctx)))
    }
  }

  return result
}

function substituteVars(args: string[], ctx: ArgContext): string[] {
  return args.map((arg) => substituteVar(arg, ctx))
}

function substituteVar(arg: string, ctx: ArgContext): string {
  const vars: Record<string, string> = {
    '${auth_player_name}': ctx.auth.name,
    '${version_name}': ctx.versionJson.id,
    '${game_directory}': ctx.gameDir,
    '${assets_root}': getAssetsDir(ctx.gameDir),
    '${assets_index_name}': ctx.versionJson.assets,
    '${auth_uuid}': ctx.auth.id,
    '${auth_access_token}': ctx.auth.accessToken,
    '${user_type}': 'msa',
    '${version_type}': ctx.versionJson.type,
    '${natives_directory}': ctx.nativesDir,
    '${launcher_name}': 'formallauncher',
    '${launcher_version}': '0.0.1',
    '${classpath}': ctx.classpath,
    '${classpath_separator}': getClasspathSeparator(),
    '${library_directory}': getLibrariesDir(ctx.gameDir),
  }

  let result = arg
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value)
  }
  return result
}
