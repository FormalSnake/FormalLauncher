import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Instance, ModEntry, ResourcePackEntry, InstanceSyncData } from '@formallauncher/shared'

function now(): string {
  return new Date().toISOString()
}

interface InstancesState {
  instances: Instance[]
  selectedInstanceId: string | null
  searchQuery: string
  deletedInstanceIds: string[]
  addInstance: (instance: Instance) => void
  removeInstance: (id: string) => void
  updateInstance: (id: string, updates: Partial<Instance>) => void
  setSelectedInstanceId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  addMod: (instanceId: string, mod: ModEntry) => void
  removeMod: (instanceId: string, projectId: string) => void
  toggleMod: (instanceId: string, projectId: string) => void
  addResourcePack: (instanceId: string, rp: ResourcePackEntry) => void
  removeResourcePack: (instanceId: string, projectId: string) => void
  mergeFromServer: (serverInstances: InstanceSyncData[]) => void
  clearDeletedIds: () => void
}

export const useInstancesStore = create<InstancesState>()(
  persist(
    (set) => ({
      instances: [],
      selectedInstanceId: null,
      searchQuery: '',
      deletedInstanceIds: [],

      addInstance: (instance) =>
        set((state) => ({
          instances: [...state.instances, { ...instance, updatedAt: now() }],
        })),

      removeInstance: (id) =>
        set((state) => ({
          instances: state.instances.filter((i) => i.id !== id),
          selectedInstanceId:
            state.selectedInstanceId === id ? null : state.selectedInstanceId,
          deletedInstanceIds: [...state.deletedInstanceIds, id],
        })),

      updateInstance: (id, updates) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === id ? { ...i, ...updates, updatedAt: now() } : i,
          ),
        })),

      setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addMod: (instanceId, mod) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  mods: [...i.mods.filter((m) => m.projectId !== mod.projectId), mod],
                  updatedAt: now(),
                }
              : i,
          ),
        })),

      removeMod: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? { ...i, mods: i.mods.filter((m) => m.projectId !== projectId), updatedAt: now() }
              : i,
          ),
        })),

      toggleMod: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  mods: i.mods.map((m) =>
                    m.projectId === projectId ? { ...m, enabled: !m.enabled } : m,
                  ),
                  updatedAt: now(),
                }
              : i,
          ),
        })),

      addResourcePack: (instanceId, rp) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  resourcePacks: [
                    ...i.resourcePacks.filter((r) => r.projectId !== rp.projectId),
                    rp,
                  ],
                  updatedAt: now(),
                }
              : i,
          ),
        })),

      removeResourcePack: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  resourcePacks: i.resourcePacks.filter((r) => r.projectId !== projectId),
                  updatedAt: now(),
                }
              : i,
          ),
        })),

      mergeFromServer: (serverInstances) =>
        set((state) => {
          const localMap = new Map(state.instances.map((i) => [i.id, i]))
          const merged: Instance[] = []

          for (const server of serverInstances) {
            const local = localMap.get(server.id)
            if (local && local.updatedAt && local.updatedAt > server.updatedAt) {
              // Local is newer, keep local
              merged.push(local)
            } else {
              // Server is newer or instance doesn't exist locally
              const { configs: _, ...instanceData } = server
              merged.push(instanceData)
            }
            localMap.delete(server.id)
          }

          // Keep local-only instances
          for (const local of localMap.values()) {
            merged.push(local)
          }

          return { instances: merged }
        }),

      clearDeletedIds: () => set({ deletedInstanceIds: [] }),
    }),
    {
      name: 'formallauncher-instances',
      partialize: (state) => ({
        instances: state.instances,
        deletedInstanceIds: state.deletedInstanceIds,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<InstancesState> | undefined
        return {
          ...current,
          instances: (p?.instances ?? []).map((i) => ({
            ...i,
            mods: i.mods ?? [],
            resourcePacks: i.resourcePacks ?? [],
          })),
          deletedInstanceIds: p?.deletedInstanceIds ?? [],
        }
      },
    },
  ),
)
