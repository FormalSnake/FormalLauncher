import { platform, arch } from 'node:os'
import type { MojangOS, MojangArch, Rule } from '../types'

export function getMojangOS(): MojangOS {
  switch (platform()) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'osx'
    default:
      return 'linux'
  }
}

export function getMojangArch(): MojangArch {
  switch (arch()) {
    case 'x64':
      return 'x86_64'
    case 'arm64':
      return 'arm64'
    default:
      return 'x86'
  }
}

export function getClasspathSeparator(): string {
  return platform() === 'win32' ? ';' : ':'
}

export function evaluateRules(rules: Rule[] | undefined): boolean {
  if (!rules || rules.length === 0) return true

  let dominated = false

  for (const rule of rules) {
    if (rule.features) continue

    const osMatches = !rule.os || matchesOS(rule.os)

    if (rule.action === 'allow') {
      if (osMatches) dominated = true
    } else {
      if (osMatches) return false
    }
  }

  // If there were allow rules, at least one must have matched
  const hasAllowRules = rules.some((r) => r.action === 'allow')
  return hasAllowRules ? dominated : true
}

function matchesOS(os: NonNullable<Rule['os']>): boolean {
  const currentOS = getMojangOS()
  const currentArch = getMojangArch()

  if (os.name && os.name !== currentOS) return false
  if (os.arch) {
    const osArch = os.arch === 'x86' ? 'x86' : os.arch
    if (osArch !== currentArch) return false
  }
  return true
}
