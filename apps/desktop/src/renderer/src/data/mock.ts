import type { Instance, ModEntry, ModLoader, User } from '@formallauncher/shared'

export const mockMods: ModEntry[] = [
  { projectId: 'AANobbMI', versionId: 'v0.5.11', name: 'Sodium', enabled: true },
  { projectId: 'gvQqBUqZ', versionId: 'v0.12.1', name: 'Lithium', enabled: true },
  { projectId: 'YL57xq9U', versionId: 'v1.7.3', name: 'Iris Shaders', enabled: true },
  { projectId: 'H8CaAYZC', versionId: 'v0.15.0', name: 'Fabric API', enabled: true },
  { projectId: 'mOgUt4GM', versionId: 'v3.5.1', name: 'Mod Menu', enabled: true },
  { projectId: 'P7dR8mSH', versionId: 'v6.2.0', name: 'Xaeros Minimap', enabled: false },
]

export const mockInstances: Instance[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Survival World',
    minecraftVersion: '1.21.4',
    modLoader: 'fabric',
    mods: mockMods.slice(0, 4),
    ramMb: 4096,
    jvmArgs: '-XX:+UseG1GC',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Creative Build',
    minecraftVersion: '1.21.4',
    modLoader: 'fabric',
    mods: mockMods.slice(0, 2),
    ramMb: 8192,
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Modded Adventure',
    minecraftVersion: '1.20.1',
    modLoader: 'forge',
    mods: mockMods,
    ramMb: 6144,
    jvmArgs: '-XX:+UseG1GC -XX:MaxGCPauseMillis=50',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    name: 'Vanilla Plus',
    minecraftVersion: '1.21.4',
    modLoader: 'quilt',
    mods: mockMods.slice(0, 1),
    ramMb: 4096,
  },
  {
    id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
    name: 'Tech Pack',
    minecraftVersion: '1.20.4',
    modLoader: 'neoforge',
    mods: mockMods.slice(0, 5),
    ramMb: 8192,
  },
]

export const mockUser: User = {
  id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
  email: 'player@example.com',
  name: 'Steve',
}

export interface MockMinecraftAccount {
  id: string
  username: string
  uuid: string
  active: boolean
}

export const mockMinecraftAccounts: MockMinecraftAccount[] = [
  { id: '1', username: 'StevePlayer', uuid: 'a1b2c3d4-0000-0000-0000-000000000001', active: true },
  { id: '2', username: 'AlexBuilder', uuid: 'a1b2c3d4-0000-0000-0000-000000000002', active: false },
]

export interface AppSettings {
  ramMb: number
  jvmArgs: string
  gameDirectory: string
  theme: 'dark'
}

export const mockSettings: AppSettings = {
  ramMb: 4096,
  jvmArgs: '-XX:+UseG1GC',
  gameDirectory: '~/.formallauncher',
  theme: 'dark',
}
