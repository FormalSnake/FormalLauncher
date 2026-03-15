import { Authflow, Titles } from 'prismarine-auth'
import type { MinecraftAccount } from '../types'

export interface LoginOptions {
  cacheDir: string
  onDeviceCode?: (code: { userCode: string; verificationUri: string; expiresIn: number }) => void
}

export async function loginWithMicrosoft(options: LoginOptions): Promise<MinecraftAccount> {
  const flow = new Authflow(
    'formallauncher',
    options.cacheDir,
    {
      flow: 'sisu',
      authTitle: Titles.MinecraftNintendoSwitch,
      deviceType: 'Nintendo',
    },
    (code) => {
      options.onDeviceCode?.({
        userCode: code.user_code,
        verificationUri: code.verification_uri,
        expiresIn: code.expires_in,
      })
    },
  )

  const mcToken = await flow.getMinecraftJavaToken()
  const profile = await getMinecraftProfile(mcToken.token)

  return {
    id: profile.id,
    name: profile.name,
    accessToken: mcToken.token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // ~24h
  }
}

export async function refreshAuth(options: { cacheDir: string }): Promise<MinecraftAccount> {
  const flow = new Authflow('formallauncher', options.cacheDir, {
    flow: 'sisu',
    authTitle: Titles.MinecraftNintendoSwitch,
    deviceType: 'Nintendo',
  })

  const mcToken = await flow.getMinecraftJavaToken()
  const profile = await getMinecraftProfile(mcToken.token)

  return {
    id: profile.id,
    name: profile.name,
    accessToken: mcToken.token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  }
}

export function validateAuth(account: MinecraftAccount): boolean {
  if (!account.accessToken) return false
  if (account.expiresAt && Date.now() >= account.expiresAt) return false
  return true
}

async function getMinecraftProfile(
  accessToken: string,
): Promise<{ id: string; name: string }> {
  const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to get Minecraft profile: ${response.status}`)
  }

  return response.json() as Promise<{ id: string; name: string }>
}
