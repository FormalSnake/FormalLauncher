import { readFile } from 'node:fs/promises'
import type { MinecraftProfileFull } from '../types'

const API_BASE = 'https://api.minecraftservices.com/minecraft/profile'

export async function getFullProfile(accessToken: string): Promise<MinecraftProfileFull> {
  const res = await fetch(API_BASE, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`)
  return res.json() as Promise<MinecraftProfileFull>
}

export async function uploadSkin(
  accessToken: string,
  filePath: string,
  variant: 'classic' | 'slim',
): Promise<void> {
  const fileData = await readFile(filePath)
  const form = new FormData()
  form.append('variant', variant)
  form.append('file', new Blob([fileData], { type: 'image/png' }), 'skin.png')

  const res = await fetch(`${API_BASE}/skins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Failed to upload skin: ${res.status}`)
}

export async function setActiveCape(
  accessToken: string,
  capeId: string | null,
): Promise<void> {
  if (capeId) {
    const res = await fetch(`${API_BASE}/capes/active`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ capeId }),
    })
    if (!res.ok) throw new Error(`Failed to set cape: ${res.status}`)
  } else {
    const res = await fetch(`${API_BASE}/capes/active`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Failed to remove cape: ${res.status}`)
  }
}
